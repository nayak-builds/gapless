"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  createNote,
  deleteNote,
  listNotes,
  toUserMessage,
  type NoteListItem,
} from "@/lib/api";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function NotesPanel() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listNotes();
      setNotes(rows);
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Couldn't load your notes. Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle && !trimmedContent && !file) {
      setError("Add a title and paste text or attach a file.");
      return;
    }
    if (!trimmedTitle) {
      setError("Add a title for this note.");
      return;
    }
    if (!trimmedContent && !file) {
      setError("Paste note text or attach a PDF, Markdown, or text file.");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setError("File is too large (max 5 MB).");
      return;
    }
    setSaving(true);
    try {
      const created = await createNote(title, content, file);
      setNotes((current) => [created, ...current]);
      setTitle("");
      setContent("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        toUserMessage(err, "Couldn't save this note. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this note and its embeddings?");
    if (!confirmed) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteNote(id);
      setNotes((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        toUserMessage(err, "Couldn't delete this note. Please try again."),
      );
    } finally {
      setBusyId(null);
    }
  }

  const canSubmit =
    title.trim().length > 0 && (content.trim().length > 0 || file !== null);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <h2 className="font-serif text-2xl text-navy">Upload a note</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Paste text or attach a PDF or Markdown file (max 5 MB). Quizzes pull
          from these notes against missing skills on the dashboard.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <Input
            id="note-title"
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
            disabled={saving}
            placeholder="e.g. System design notes"
          />
          <Textarea
            id="note-content"
            label="Note text (optional if you upload a file)"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={saving}
            placeholder="Paste a few paragraphs here"
          />
          <Input
            id="note-file"
            label="File (optional)"
            type="file"
            accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
            disabled={saving}
            ref={fileInputRef}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              if (next && next.size > MAX_FILE_BYTES) {
                setError("File is too large (max 5 MB).");
                setFile(null);
                event.target.value = "";
                return;
              }
              setError(null);
              setFile(next);
            }}
          />
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={saving || !canSubmit}
            aria-busy={saving}
          >
            {saving ? "Saving…" : "Save note"}
          </Button>
        </form>
        {error ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      <div>
        <h2 className="font-serif text-2xl text-navy">Your notes</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Loading notes…</p>
        ) : notes.length === 0 && !error ? (
          <Card className="mt-4">
            <p className="text-sm text-ink-muted">
              You haven&apos;t uploaded any notes yet. Add a title and paste a
              short write-up, or attach a file, then save.
            </p>
          </Card>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {notes.map((item) => (
              <li key={item.id}>
                <Card>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words font-serif text-lg text-navy">
                        {item.title?.trim() || "Untitled note"}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatCreatedAt(item.created_at)}
                        <span className="mx-2">·</span>
                        {item.chunk_count}{" "}
                        {item.chunk_count === 1 ? "chunk" : "chunks"}
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={busyId === item.id || saving}
                      aria-busy={busyId === item.id}
                      onClick={() => void handleDelete(item.id)}
                    >
                      {busyId === item.id ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
