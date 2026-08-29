"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  computeGaps,
  createApplication,
  parseJd,
  toUserMessage,
  type ComputeGapsResponse,
} from "@/lib/api";
import { QuizModal } from "@/components/dashboard/QuizModal";

export function JdAnalyzeCard() {
  const [rawText, setRawText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seniority, setSeniority] = useState<string | null>(null);
  const [result, setResult] = useState<ComputeGapsResponse | null>(null);
  const [jdId, setJdId] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [trackMessage, setTrackMessage] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [quizGap, setQuizGap] = useState<{ id: string; name: string } | null>(
    null,
  );

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTrackMessage(null);
    setTrackError(null);
    setPending(true);
    try {
      const parsed = await parseJd(rawText);
      const gaps = await computeGaps(parsed.jd_id);
      setSeniority(parsed.seniority);
      setResult(gaps);
      setJdId(parsed.jd_id);
    } catch (err) {
      setResult(null);
      setSeniority(null);
      setJdId(null);
      setError(
        toUserMessage(
          err,
          "Couldn't analyze this job description, please try again",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function handleTrack() {
    if (!jdId) return;
    setTrackError(null);
    setTrackMessage(null);
    setTracking(true);
    try {
      await createApplication(jdId);
      setTrackMessage("Application added to your tracker.");
    } catch (err) {
      setTrackError(
        toUserMessage(err, "Couldn't add this job to your tracker. Please try again."),
      );
    } finally {
      setTracking(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <h2 className="font-serif text-2xl text-navy">Paste job description</h2>
        <p className="mt-2 text-sm text-ink-muted">
          We extract required skills and compare them to your list. This can take a few seconds.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleAnalyze(e)}>
          <Textarea
            id="jd-text"
            label="Job description"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            required
            disabled={pending}
            placeholder="Paste the full job description here"
          />
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={pending || !rawText.trim()}
            aria-busy={pending}
          >
            {pending ? "Analyzing…" : "Analyze"}
          </Button>
        </form>
        {error ? (
          <p className="mt-4 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Card>

      {result ? (
        <>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <h3 className="font-serif text-xl text-navy">Skills you have</h3>
            {seniority ? (
              <p className="mt-1 text-sm text-ink-muted">Role seniority: {seniority}</p>
            ) : null}
            {result.matched.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">No overlapping skills for this JD.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {result.matched.map((item) => (
                  <li key={item.name} className="text-sm text-ink">
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h3 className="font-serif text-xl text-navy">Skills you’re missing</h3>
            {result.missing.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">No missing skills detected.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {result.missing.map((item) => (
                  <li
                    key={item.id}
                    className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 break-words text-sm text-ink">
                      {item.name}
                      {item.gap_level && item.gap_level !== "none" ? (
                        <span className="ml-2 text-ink-muted">({item.gap_level})</span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => setQuizGap({ id: item.id, name: item.name })}
                    >
                      Quiz me
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:items-start">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={tracking || !jdId}
            aria-busy={tracking}
            onClick={() => void handleTrack()}
          >
            {tracking ? "Tracking…" : "Track this application"}
          </Button>
          {trackMessage ? (
            <p className="text-sm text-success" role="status">
              {trackMessage}
            </p>
          ) : null}
          {trackError ? (
            <p className="text-sm text-danger" role="alert">
              {trackError}
            </p>
          ) : null}
        </div>
      </>
      ) : null}

      {quizGap ? (
        <QuizModal
          gapId={quizGap.id}
          skillName={quizGap.name}
          onClose={() => setQuizGap(null)}
        />
      ) : null}
    </div>
  );
}
