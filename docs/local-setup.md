# Local setup

## Frontend (scaffolded)

Requires Node 20. Use a **dev** Supabase project (not production).

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Edit `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key only), and `NEXT_PUBLIC_API_URL=http://localhost:8000` (`NEXT_PUBLIC_API_BASE_URL` still works). Restart `npm run dev` after changing `NEXT_PUBLIC_*` values.

Open [http://localhost:3000](http://localhost:3000). Routes: `/`, `/signin` (email + password), `/dashboard` (session required). For local signup without a confirmation email, turn off **Confirm email** in the dev project's Auth settings.

FastAPI login (`POST /auth/login`) is not used for this UI yet. Do not point this UI at production Supabase.

## Backend (scaffolded)

Requires Python 3.12. Use a **dev** Supabase project (not production).

```powershell
cd backend
python -m venv .venv
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

On Windows, if `Activate.ps1` fails with “running scripts is disabled”, the `Set-ExecutionPolicy` line above is required once per user. It only affects your account, not the whole machine.

If you prefer not to change policy, skip activation and call the venv directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8000
```

Edit `backend/.env` with real values (this file must never be committed). Then:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) — process is up (no database)
- [http://127.0.0.1:8000/health/db](http://127.0.0.1:8000/health/db) — `SELECT 1` against Supabase Postgres

If uvicorn used to crash with `TimeoutError` in `asyncpg` during startup, set `SUPABASE_DB_CONNECTION_STRING` to the **Session pooler** URI (port **6543**, host like `aws-0-….pooler.supabase.com`), not the direct `db.<project>.supabase.co:5432` URL. Windows often cannot complete the direct connection before the timeout.

CORS allows origins from `FRONTEND_URL` (default `http://localhost:3000` if unset). Dashboard skills and JD analyze call this API with the Supabase access token. Set `GROQ_API_KEY` in `backend/.env` for `/jd/parse`.

Notes ingest (`POST /notes`) needs `chromadb` 1.x (see `requirements.txt`; 0.5.x often fails to install on Windows without C++ build tools). Apply `backend/migrations/002_notes_embeddings.sql` then `backend/migrations/003_quiz_attempts.sql` in the Supabase SQL Editor before using `/notes` and `/quiz/*`. Chroma data is written under `CHROMA_PATH` (default `backend/chroma_data`). The first upload downloads the MiniLM ONNX model (~80 MB) into the Chroma cache.

Never use production service-role keys on a laptop.
