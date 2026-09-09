"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  addOwnedSkills,
  getOwnedSkills,
  parseResume,
  saveOwnedSkills,
  toUserMessage,
} from "@/lib/api";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_SUFFIXES = new Set([".pdf", ".txt", ".md", ".markdown"]);
const COLLAPSED_SKILL_COUNT = 8;

function fileSuffix(name: string): string {
  const lower = name.trim().toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) return "";
  return lower.slice(dot);
}

function isAllowedResumeFile(file: File): boolean {
  return ALLOWED_SUFFIXES.has(fileSuffix(file.name));
}

export function SkillsCard({
  onSkillsChanged,
}: {
  onSkillsChanged?: (names: string[]) => void;
}) {
  const [skills, setSkills] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [extracted, setExtracted] = useState<string[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showAllSkills, setShowAllSkills] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onSkillsChangedRef = useRef(onSkillsChanged);
  onSkillsChangedRef.current = onSkillsChanged;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const names = await getOwnedSkills();
        if (!cancelled) {
          setSkills(names);
          onSkillsChangedRef.current?.(names);
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
      onSkillsChangedRef.current?.(saved);
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

  async function handleClearAll() {
    const ok = window.confirm(
      `Remove all ${skills.length} saved skills? The gap on this page will refresh against an empty list. Other tracked jobs keep their last analyze until you analyze them again.`,
    );
    if (!ok) return;
    const cleared = await persist([]);
    if (cleared) {
      setExtracted([]);
      setChecked(new Set());
      setShowAllSkills(false);
    }
  }

  async function handleResumeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!isAllowedResumeFile(file)) {
      setError("Upload a PDF, Markdown, or text file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large (max 5 MB).");
      return;
    }

    setParsing(true);
    setError(null);
    try {
      const parsed = await parseResume(file);
      const names = parsed.skills.map((skill) => skill.name).filter(Boolean);
      setExtracted(names);
      setChecked(new Set(names));
    } catch (err) {
      setExtracted([]);
      setChecked(new Set());
      setError(
        toUserMessage(err, "Couldn't read this resume. Please try again."),
      );
    } finally {
      setParsing(false);
    }
  }

  function toggleExtracted(name: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function handleAddExtracted() {
    const selected = extracted.filter((name) => checked.has(name));
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await addOwnedSkills(selected);
      setSkills(saved);
      onSkillsChangedRef.current?.(saved);
      setExtracted([]);
      setChecked(new Set());
    } catch (err) {
      setError(
        toUserMessage(err, "Couldn't save your skills. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = extracted.filter((name) => checked.has(name)).length;
  const busy = saving || parsing;
  const emptyList = !loading && skills.length === 0;
  const visibleSkills =
    showAllSkills || skills.length <= COLLAPSED_SKILL_COUNT
      ? skills
      : skills.slice(0, COLLAPSED_SKILL_COUNT);

  return (
    <Card>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-serif text-2xl text-navy">Your skills</h3>
        {!loading && skills.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-sm text-ink-muted">{skills.length} saved</p>
            <Button
              type="button"
              variant="ghost"
              className="w-full !text-danger sm:w-auto"
              disabled={busy}
              onClick={() => void handleClearAll()}
            >
              Clear all
            </Button>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        Each job is compared to this list and to your latest uploaded resume —
        even for skills you did not tag, such as Computer Vision from OpenCV
        work.
      </p>

      {loading ? (
        <div className="mt-6">
          <p className="sr-only">Loading skills…</p>
          <ul className="flex flex-wrap gap-2" aria-hidden>
            {[0, 1, 2].map((index) => (
              <li
                key={index}
                className="h-8 w-20 animate-pulse rounded-md border border-line bg-accent-muted"
              />
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              id="resume-file"
              type="file"
              className="sr-only"
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
              disabled={busy}
              onChange={(event) => void handleResumeFile(event)}
            />
            <Button
              type="button"
              variant={emptyList ? "primary" : "secondary"}
              className="w-full sm:w-auto"
              disabled={busy}
              aria-busy={parsing}
              onClick={() => fileInputRef.current?.click()}
            >
              {parsing ? "Reading resume…" : "Upload resume"}
            </Button>
            <p className="text-sm text-ink-muted">
              Fastest way to start. PDF or text, max 5 MB. Review before we
              save.
            </p>
          </div>

          {extracted.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4 rounded-md border border-line bg-canvas p-4">
              <p className="text-sm text-ink">
                From your resume — uncheck anything that is not you, then add
                them to your list.
              </p>
              <ul className="flex flex-wrap gap-2">
                {extracted.map((name) => (
                  <li key={name} className="min-w-0">
                    <label className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3 py-1 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-accent"
                        checked={checked.has(name)}
                        onChange={() => toggleExtracted(name)}
                        disabled={busy}
                      />
                      <span className="min-w-0 break-words">{name}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={busy || selectedCount === 0}
                aria-busy={saving}
                onClick={() => void handleAddExtracted()}
              >
                {saving ? "Saving…" : "Add to my skills"}
              </Button>
            </div>
          ) : null}

          <form
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(e) => void handleAdd(e)}
          >
            <div className="flex-1">
              <Input
                id="new-skill"
                label="Or type a skill"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="e.g. Python"
                maxLength={80}
                disabled={busy}
              />
            </div>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={busy || !draft.trim()}
              aria-busy={saving}
            >
              {saving && extracted.length === 0 ? "Saving…" : "Add"}
            </Button>
          </form>

          {skills.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">
              No skills on your list yet. You can still paste a job — we will
              also use your resume if you uploaded one.
            </p>
          ) : (
            <>
              <ul className="mt-6 flex flex-wrap gap-2">
                {visibleSkills.map((name) => (
                  <li
                    key={name}
                    className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border border-line bg-canvas py-1 pl-3 pr-1 text-sm text-ink"
                  >
                    <span className="min-w-0 break-words">{name}</span>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted hover:bg-accent-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      onClick={() => void handleRemove(name)}
                      disabled={busy}
                      aria-busy={saving}
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              {skills.length > COLLAPSED_SKILL_COUNT ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => setShowAllSkills((open) => !open)}
                >
                  {showAllSkills
                    ? "Show less"
                    : `Show all ${skills.length}`}
                </Button>
              ) : null}
            </>
          )}
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
