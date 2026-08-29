"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getOwnedSkills, saveOwnedSkills, toUserMessage } from "@/lib/api";

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
          setError(
            toUserMessage(err, "Couldn't load your skills. Please try again."),
          );
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

  async function persist(next: string[]): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveOwnedSkills(next);
      setSkills(saved);
      return true;
    } catch (err) {
      setError(
        toUserMessage(err, "Couldn't save your skills. Please try again."),
      );
      return false;
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
    const ok = await persist([...skills, name]);
    if (!ok) {
      setDraft(name);
    }
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
              <li className="max-w-prose text-sm text-ink-muted">
                You haven&apos;t added any skills yet. Add a few you already
                know — we&apos;ll match them against job descriptions you paste
                below.
              </li>
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
                    aria-busy={saving}
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
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving || !draft.trim()}
              aria-busy={saving}
            >
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
