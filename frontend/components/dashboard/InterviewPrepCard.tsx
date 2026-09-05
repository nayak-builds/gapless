"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  ApiError,
  generateInterviewPrep,
  getInterviewPrep,
  toUserMessage,
  type InterviewDifficulty,
  type InterviewPrepResponse,
  type InterviewQuestion,
} from "@/lib/api";

const ORDER: InterviewDifficulty[] = ["easy", "medium", "hard"];

type ColumnKind = "have" | "missing";

function practicedStorageKey(jdId: string): string {
  return `interview-prep-practiced:${jdId}`;
}

function loadPracticed(jdId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(practicedStorageKey(jdId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function questionKey(item: InterviewQuestion): string {
  return `${item.skill}|${item.difficulty}|${item.question}`;
}

function allQuestions(prep: InterviewPrepResponse): InterviewQuestion[] {
  return [...prep.confident_questions, ...prep.fundamentals_questions];
}

function QuestionRow({
  item,
  practiced,
  onToggle,
}: {
  item: InterviewQuestion;
  practiced: boolean;
  onToggle: () => void;
}) {
  const labelId = useId();

  return (
    <li
      className={cn(
        "min-w-0 rounded-md border p-4",
        practiced ? "border-accent bg-accent-muted" : "border-line bg-surface",
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <span className="inline-flex w-fit max-w-full items-center rounded-sm bg-surface px-2 py-0.5 text-xs text-accent ring-1 ring-line">
          <span className="min-w-0 break-words">{item.skill}</span>
        </span>
        <p id={labelId} className="min-w-0 break-words text-sm text-ink">
          {item.question}
        </p>
        <button
          type="button"
          role="checkbox"
          aria-checked={practiced}
          aria-label={`Mark as practiced: ${item.skill}`}
          onClick={onToggle}
          className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-sm text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
              practiced
                ? "border-accent bg-accent"
                : "border-line bg-surface",
            )}
            aria-hidden
          >
            {practiced ? (
              <span className="block h-1.5 w-2 -translate-y-px rotate-45 border-b-2 border-r-2 border-navy-fg" />
            ) : null}
          </span>
          <span className={practiced ? "text-accent" : "text-ink-muted"}>
            {practiced ? "Practiced" : "Mark as practiced"}
          </span>
        </button>
      </div>
    </li>
  );
}

function QuestionList({
  items,
  practiced,
  onToggle,
}: {
  items: InterviewQuestion[];
  practiced: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-muted">
        No questions in this section for this job.
      </p>
    );
  }

  const grouped = ORDER.map((level) => ({
    level,
    items: items.filter((item) => item.difficulty === level),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mt-4 flex flex-col gap-6">
      {grouped.map((group) => (
        <div key={group.level}>
          <h4
            className={cn(
              "text-sm font-medium capitalize",
              group.level === "easy" && "text-success",
              group.level === "medium" && "text-warning",
              group.level === "hard" && "text-danger",
            )}
          >
            {group.level} · {group.items.length}
          </h4>
          <ul className="mt-3 flex flex-col gap-3">
            {group.items.map((item) => {
              const key = questionKey(item);
              return (
                <QuestionRow
                  key={key}
                  item={item}
                  practiced={Boolean(practiced[key])}
                  onToggle={() => onToggle(key)}
                />
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PrepColumn({
  kind,
  items,
  practiced,
  onToggle,
}: {
  kind: ColumnKind;
  items: InterviewQuestion[];
  practiced: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const isMissing = kind === "missing";

  return (
    <Card>
      <h3 className="font-serif text-xl text-navy">
        {isMissing ? "Skills you’re missing" : "Skills you already have"}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">
        {isMissing
          ? "Answer from first principles; they will not expect production war stories."
          : "Expect follow-ups on real experience."}
      </p>
      <QuestionList items={items} practiced={practiced} onToggle={onToggle} />
    </Card>
  );
}

function SkeletonRows() {
  return (
    <Card>
      <div className="flex flex-col gap-3" aria-hidden>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-md border border-line bg-accent-muted"
          />
        ))}
      </div>
      <p className="sr-only">Checking saved questions…</p>
    </Card>
  );
}

export function InterviewPrepCard({ jdId }: { jdId: string }) {
  const [prep, setPrep] = useState<InterviewPrepResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiced, setPracticed] = useState<Record<string, boolean>>({});
  const [mobileTab, setMobileTab] = useState<ColumnKind>("missing");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPrep(null);
    setPracticed(loadPracticed(jdId));
    setMobileTab("missing");

    async function load() {
      try {
        const saved = await getInterviewPrep(jdId);
        if (!cancelled) {
          setPrep(saved);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setPrep(null);
          return;
        }
        setError(
          toUserMessage(err, "Couldn't load interview questions. Please try again."),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [jdId]);

  function togglePracticed(key: string) {
    setPracticed((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        localStorage.setItem(practicedStorageKey(jdId), JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }

  async function runGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const created = await generateInterviewPrep(jdId);
      setPrep(created);
    } catch (err) {
      setError(
        toUserMessage(
          err,
          "Couldn't generate interview questions. Please try again.",
        ),
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleGenerate() {
    if (prep) {
      const ok = window.confirm(
        "Replace these questions? This uses another AI request.",
      );
      if (!ok) return;
    }
    void runGenerate();
  }

  const questions = prep ? allQuestions(prep) : [];
  const total = questions.length;
  const practicedCount = questions.filter(
    (item) => practiced[questionKey(item)],
  ).length;
  const busy = generating || loading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-serif text-xl text-navy">Interview Prep</h3>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Rehearse this job: defend skills you have, and cover the gaps. No
            scoring.
          </p>
          {prep && total > 0 ? (
            <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
              {practicedCount} of {total} practiced
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant={prep ? "secondary" : "primary"}
          className="w-full shrink-0 sm:w-auto"
          disabled={busy}
          aria-busy={generating}
          onClick={handleGenerate}
        >
          {generating
            ? "Generating…"
            : prep
              ? "Regenerate"
              : "Generate interview questions"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? <SkeletonRows /> : null}

      {!loading && !prep ? (
        <Card>
          <p className="text-sm text-ink-muted">
            We’ll turn this gap into rehearsal questions.
          </p>
        </Card>
      ) : null}

      {prep ? (
        <>
          <div
            className="grid h-10 grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1 lg:hidden"
            role="tablist"
            aria-label="Interview prep sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "have"}
              className={cn(
                "h-8 rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                mobileTab === "have"
                  ? "bg-accent-muted text-navy"
                  : "text-ink-muted hover:text-ink",
              )}
              onClick={() => setMobileTab("have")}
            >
              Have
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === "missing"}
              className={cn(
                "h-8 rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                mobileTab === "missing"
                  ? "bg-accent-muted text-navy"
                  : "text-ink-muted hover:text-ink",
              )}
              onClick={() => setMobileTab("missing")}
            >
              Missing
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div
              className={cn(
                mobileTab === "have" ? "block" : "hidden",
                "lg:block",
              )}
            >
              <PrepColumn
                kind="have"
                items={prep.confident_questions}
                practiced={practiced}
                onToggle={togglePracticed}
              />
            </div>
            <div
              className={cn(
                mobileTab === "missing" ? "block" : "hidden",
                "lg:block",
              )}
            >
              <PrepColumn
                kind="missing"
                items={prep.fundamentals_questions}
                practiced={practiced}
                onToggle={togglePracticed}
              />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
