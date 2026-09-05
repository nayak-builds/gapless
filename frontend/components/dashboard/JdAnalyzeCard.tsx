"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { InterviewPrepCard } from "@/components/dashboard/InterviewPrepCard";
import { QuizModal } from "@/components/dashboard/QuizModal";

const LAST_ANALYSIS_KEY = "gapless:last-jd-analysis";

type StoredAnalysis = {
  jdId: string;
  seniority: string | null;
  result: ComputeGapsResponse;
};

function loadStoredAnalysis(): StoredAnalysis | null {
  try {
    const raw = sessionStorage.getItem(LAST_ANALYSIS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAnalysis;
    if (!parsed?.jdId || !parsed.result) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredAnalysis(value: StoredAnalysis) {
  try {
    sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

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

  useEffect(() => {
    const stored = loadStoredAnalysis();
    if (!stored) return;
    setJdId(stored.jdId);
    setSeniority(stored.seniority);
    setResult(stored.result);
  }, []);

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
      saveStoredAnalysis({
        jdId: parsed.jd_id,
        seniority: parsed.seniority,
        result: gaps,
      });
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
        <h2 className="font-serif text-2xl text-navy">This job</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Paste the full posting. We extract skills and compare them to your
          list.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Best results if Your skills above is not empty.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleAnalyze(e)}>
          <Textarea
            id="jd-text"
            label="Job description"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            required
            disabled={pending}
            placeholder="Paste the full job description, including requirements."
          />
          {!rawText.trim() ? (
            <p className="text-sm text-ink-muted">
              Paste a job description to analyze.
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={pending || !rawText.trim()}
            aria-busy={pending}
          >
            {pending ? "Analyzing…" : "Analyze this job"}
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
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <Card className="flex h-full flex-col">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <h3 className="min-w-0 font-serif text-xl text-navy">
                  Skills you already have
                </h3>
                {seniority ? (
                  <span className="inline-flex w-fit max-w-full items-center rounded-sm bg-accent-muted px-2 py-0.5 text-xs text-accent">
                    <span className="min-w-0 break-words">Role · {seniority}</span>
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-ink-muted">
                {result.matched.length === 0
                  ? "Nothing on this posting overlaps your list yet."
                  : `${result.matched.length} from this posting match your list. Be ready to talk about them.`}
              </p>
            </div>
            {result.matched.length === 0 ? null : (
              <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2">
                {result.matched.map((item) => (
                  <li
                    key={item.name}
                    className="inline-flex max-w-full items-center rounded-md border border-line bg-canvas px-3 py-1 text-sm text-ink"
                  >
                    <span className="min-w-0 break-words">{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="flex h-full flex-col">
            <div className="flex min-w-0 flex-col gap-3">
              <h3 className="font-serif text-xl text-navy">
                Skills you’re missing
              </h3>
              <p className="text-sm text-ink-muted">
                {result.missing.length === 0
                  ? "No extra skills called out beyond what you already have."
                  : `${result.missing.length} to cover. Quiz from your notes, or use Interview Prep below.`}
              </p>
            </div>
            {result.missing.length === 0 ? null : (
              <ul className="mt-4 flex flex-col gap-3">
                {result.missing.map((item) => (
                  <li
                    key={item.id}
                    className="flex min-w-0 flex-col gap-2 rounded-md border border-line bg-canvas p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm text-ink">{item.name}</p>
                      {item.gap_level && item.gap_level !== "none" ? (
                        <p
                          className={
                            item.gap_level === "required"
                              ? "mt-1 text-xs text-warning"
                              : "mt-1 text-xs text-ink-muted"
                          }
                        >
                          {item.gap_level === "required"
                            ? "Required on this posting"
                            : "Nice to have"}
                        </p>
                      ) : null}
                    </div>
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
        <Card>
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="font-medium text-ink">Save this role to Tracker</p>
              <p className="mt-1 text-sm text-ink-muted">
                Keep it on your board so the gap stays with the application.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full shrink-0 sm:w-auto"
              disabled={tracking || !jdId}
              aria-busy={tracking}
              onClick={() => void handleTrack()}
            >
              {tracking ? "Tracking…" : "Track this application"}
            </Button>
          </div>
          {trackMessage ? (
            <p className="mt-3 text-sm text-success" role="status">
              {trackMessage}
            </p>
          ) : null}
          {trackError ? (
            <p className="mt-3 text-sm text-danger" role="alert">
              {trackError}
            </p>
          ) : null}
        </Card>
        {jdId ? <InterviewPrepCard jdId={jdId} /> : null}
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
