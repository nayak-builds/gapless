"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ApiError,
  postMatchScore,
  toUserMessage,
  type MatchScoreResponse,
} from "@/lib/api";

function focusResumeUpload() {
  document.getElementById("dashboard-step-you")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  const input = document.getElementById("resume-file") as HTMLInputElement | null;
  input?.click();
}

export function MatchScoreCard({ jdId }: { jdId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [result, setResult] = useState<MatchScoreResponse | null>(null);

  async function handleCheck() {
    setError(null);
    setNeedsResume(false);
    setPending(true);
    try {
      const data = await postMatchScore(jdId);
      setResult(data);
    } catch (err) {
      setResult(null);
      const isResumeMissing =
        err instanceof ApiError &&
        err.status === 422 &&
        /upload a resume first/i.test(err.message);
      setNeedsResume(isResumeMissing);
      setError(
        isResumeMissing
          ? "Upload a resume first so we can quote real lines from it."
          : toUserMessage(
              err,
              "Couldn't suggest resume wording. Please try again.",
            ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="font-medium text-ink">Improve resume wording</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Optional. We only suggest a rewrite when we can quote a real line
            from your uploaded resume — never invented experience.
          </p>
        </div>
        {needsResume ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            onClick={focusResumeUpload}
          >
            Upload resume
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            disabled={pending}
            aria-busy={pending}
            onClick={() => void handleCheck()}
          >
            {pending ? "Checking wording…" : "Suggest wording"}
          </Button>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {result && result.suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted" role="status">
          No wording suggestions. Either the gaps are not on your resume, or
          nothing related was safe to quote.
        </p>
      ) : null}

      {result && result.suggestions.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-4">
          {result.suggestions.map((item) => (
            <li key={item.skill} className="min-w-0 rounded-md border border-line p-4">
              <p className="text-sm font-medium text-ink">{item.skill}</p>
              <div className="mt-3 grid min-w-0 gap-4 md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">
                    Current resume
                  </p>
                  <blockquote className="mt-2 min-w-0 break-words border-l-2 border-line pl-3 text-sm italic text-ink">
                    {item.original_quote}
                  </blockquote>
                </div>
                <div className="min-w-0 rounded-md bg-accent-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-accent">
                    Suggested rewrite
                  </p>
                  <p className="mt-2 min-w-0 break-words text-sm text-ink">
                    {item.suggested_rewrite}
                  </p>
                  <p className="mt-2 text-xs text-ink-muted">
                    Draft only — this is not text you have already written.
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
