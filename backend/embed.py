"""Local ONNX MiniLM embeddings (384-d), same family as Chroma's default."""

import logging
import tarfile
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import HTTPException
from tokenizers import Tokenizer

from config import get_settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384
_MAX_LENGTH = 256
_MODEL_URL = "https://chroma-onnx-models.s3.amazonaws.com/all-MiniLM-L6-v2/onnx.tar.gz"

_session: ort.InferenceSession | None = None
_tokenizer: Tokenizer | None = None


def _cache_dir() -> Path:
    path = Path(get_settings().embed_cache)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _find_file(root: Path, name: str) -> Path | None:
    matches = list(root.rglob(name))
    return matches[0] if matches else None


def _try_huggingface() -> tuple[Path, Path] | None:
    try:
        from huggingface_hub import hf_hub_download

        cache = str(_cache_dir() / "hf")
        model = Path(
            hf_hub_download(
                repo_id="sentence-transformers/all-MiniLM-L6-v2",
                filename="onnx/model.onnx",
                cache_dir=cache,
            )
        )
        tok = Path(
            hf_hub_download(
                repo_id="sentence-transformers/all-MiniLM-L6-v2",
                filename="tokenizer.json",
                cache_dir=cache,
            )
        )
        if model.exists() and tok.exists():
            return model, tok
    except Exception:
        logger.info("Hugging Face MiniLM ONNX unavailable; using archive fallback")
    return None


def _ensure_model_files() -> tuple[Path, Path]:
    cache = _cache_dir()
    extract_root = cache / "all-MiniLM-L6-v2"
    model_path = _find_file(extract_root, "model.onnx") if extract_root.exists() else None
    tok_path = _find_file(extract_root, "tokenizer.json") if extract_root.exists() else None
    if model_path and tok_path:
        return model_path, tok_path

    hf_files = _try_huggingface()
    if hf_files:
        return hf_files

    extract_root.mkdir(parents=True, exist_ok=True)
    archive = cache / "onnx.tar.gz"
    try:
        if not archive.exists() or archive.stat().st_size < 1000:
            logger.info("Downloading MiniLM ONNX model into embed cache")
            urllib.request.urlretrieve(_MODEL_URL, archive)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not download the embedding model. Check the network and try again.",
        ) from exc
    try:
        with tarfile.open(archive, "r:gz") as tar:
            tar.extractall(extract_root, filter="data")
    except TypeError:
        with tarfile.open(archive, "r:gz") as tar:
            tar.extractall(extract_root)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not unpack the embedding model. Please try again.",
        ) from exc

    model_path = _find_file(extract_root, "model.onnx")
    tok_path = _find_file(extract_root, "tokenizer.json")
    if model_path is None or tok_path is None:
        raise HTTPException(
            status_code=503,
            detail="Embedding model files are missing. Clear embed_cache and try again.",
        )
    return model_path, tok_path


def _load() -> tuple[ort.InferenceSession, Tokenizer]:
    global _session, _tokenizer
    if _session is not None and _tokenizer is not None:
        return _session, _tokenizer
    model_path, tok_path = _ensure_model_files()
    try:
        _session = ort.InferenceSession(
            str(model_path),
            providers=["CPUExecutionProvider"],
        )
        tokenizer = Tokenizer.from_file(str(tok_path))
        tokenizer.enable_truncation(max_length=_MAX_LENGTH)
        tokenizer.enable_padding(length=_MAX_LENGTH)
        _tokenizer = tokenizer
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not load the embedding model. Please try again.",
        ) from exc
    return _session, _tokenizer


def _mean_pool(last_hidden: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    mask = attention_mask.astype(np.float32)[:, :, None]
    summed = (last_hidden * mask).sum(axis=1)
    counts = np.clip(mask.sum(axis=1), a_min=1e-9, a_max=None)
    return summed / counts


def _l2_normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms = np.clip(norms, a_min=1e-12, a_max=None)
    return vectors / norms


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    session, tokenizer = _load()
    encoded = tokenizer.encode_batch(texts)
    input_ids = np.array([item.ids for item in encoded], dtype=np.int64)
    attention_mask = np.array([item.attention_mask for item in encoded], dtype=np.int64)
    type_ids = np.array([item.type_ids for item in encoded], dtype=np.int64)

    feeds: dict[str, np.ndarray] = {}
    for inp in session.get_inputs():
        name = inp.name
        if "mask" in name.lower():
            feeds[name] = attention_mask
        elif "type" in name.lower():
            feeds[name] = type_ids
        else:
            feeds[name] = input_ids

    try:
        outputs = session.run(None, feeds)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not embed this note. Please try again.",
        ) from exc

    hidden = np.array(outputs[0], dtype=np.float32)
    if hidden.ndim == 3:
        pooled = _mean_pool(hidden, attention_mask)
    elif hidden.ndim == 2:
        pooled = hidden
    else:
        raise HTTPException(
            status_code=503,
            detail="Could not embed this note. Please try again.",
        )
    normalized = _l2_normalize(pooled)
    if normalized.shape[1] != EMBEDDING_DIM:
        raise HTTPException(
            status_code=503,
            detail="Embedding dimension mismatch. Please try again.",
        )
    return normalized.astype(np.float32).tolist()
