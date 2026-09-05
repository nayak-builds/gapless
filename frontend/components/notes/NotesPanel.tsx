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
  const showSaveHint = title.trim().length > 0 && !content.trim() && !file;

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <h2 className="font-serif text-2xl text-navy">Add a note</h2>
        <p className="mt-2 text-sm text-ink-muted">
          A title plus pasted text or a PDF. Max 5 MB.
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
          <div className="flex flex-col gap-2">
            <Textarea
              id="note-content"
              label="Note text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={saving}
              placeholder="Paste a few paragraphs here"
            />
            <p className="text-sm text-ink-muted">Skip this if you attach a file.</p>
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              id="note-file"
              type="file"
              className="sr-only"
              accept=".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain"
              disabled={saving}
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
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => fileInputRef.current?.click()}
            >
              Attach file
            </Button>
            <p className="min-w-0 break-words text-sm text-ink-muted">
              {file ? file.name : "PDF or text, max 5 MB."}
            </p>
          </div>
          {showSaveHint ? (
            <p className="text-sm text-ink-muted">
              Paste text or attach a file to save.
            </p>
          ) : null}
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
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-serif text-2xl text-navy">Your notes</h2>
          {!loading && notes.length > 0 ? (
            <p className="text-sm text-ink-muted">{notes.length} saved</p>
          ) : null}
        </div>
        {loading ? (
          <div className="mt-4 flex flex-col gap-4">
            <p className="sr-only">Loading notes…</p>
            {[0, 1].map((index) => (
              <Card key={index} aria-hidden>
                <div className="h-6 w-2/3 max-w-sm animate-pulse rounded-sm bg-accent-muted" />
                <div className="mt-3 h-4 w-40 animate-pulse rounded-sm bg-accent-muted" />
              </Card>
            ))}
          </div>
        ) : notes.length === 0 && !error ? (
          <Card className="mt-4">
            <p className="text-sm text-ink-muted">
              No notes yet. Save one above so dashboard quizzes have something
              to draw from.
            </p>
          </Card>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {notes.map((item) => (
              <li key={item.id}>
                <Card>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="min-w-0 break-words font-serif text-lg text-navy">
                        {item.title?.trim() || "Untitled note"}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {formatCreatedAt(item.created_at)}
                        <span className="mx-2">·</span>
                        {item.chunk_count}{" "}
                        {item.chunk_count === 1 ? "section" : "sections"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      type="button"
                      className="w-full !text-danger sm:w-auto"
                      disabled={busyId === item.id || saving}
                      aria-busy={busyId === item.id}
                      onClick={() => void handleDelete(item.id)}
                    >
                      {busyId === item.id ? "Deleting…" : "Remove"}
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
