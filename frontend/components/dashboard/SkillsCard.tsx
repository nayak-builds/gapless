"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, getOwnedSkills, saveOwnedSkills } from "@/lib/api";

export function SkillsCard() {
  const [skills, setSkills] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const names = await getOwnedSkills();
        if (!cancelled) {
          setSkills(names);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load skills");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: string[]) {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveOwnedSkills(next);
      setSkills(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save skills");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    const exists = skills.some((s) => s.toLowerCase() === name.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    setDraft("");
    await persist([...skills, name]);
  }

  async function handleRemove(name: string) {
    await persist(skills.filter((s) => s !== name));
  }

  return (
    <Card>
      <h2 className="font-serif text-2xl text-navy">My skills</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Add skills you already have. Gap analysis matches these names, ignoring case.
      </p>
      {loading ? (
        <p className="mt-6 text-sm text-ink-muted">Loading skills…</p>
      ) : (
        <>
          <ul className="mt-6 flex flex-wrap gap-2">
            {skills.length === 0 ? (
              <li className="text-sm text-ink-muted">No skills yet.</li>
            ) : (
              skills.map((name) => (
                <li
                  key={name}
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-canvas px-3 py-1 text-sm text-ink"
                >
                  <span className="min-w-0 break-words">{name}</span>
                  <button
                    type="button"
                    className="text-ink-muted hover:text-ink"
                    onClick={() => void handleRemove(name)}
                    disabled={saving}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </li>
              ))
            )}
          </ul>
          <form className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={(e) => void handleAdd(e)}>
            <div className="flex-1">
              <Input
                id="new-skill"
                label="Add a skill"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="e.g. Python"
                maxLength={80}
                disabled={saving}
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto" disabled={saving || !draft.trim()}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </form>
        </>
      )}
      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
