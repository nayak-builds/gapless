"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  ApiError,
  computeGaps,
  createApplication,
  parseJd,
  toUserMessage,
  type ComputeGapsResponse,
} from "@/lib/api";
import { InterviewPrepCard } from "@/components/dashboard/InterviewPrepCard";
import { MatchScoreCard } from "@/components/dashboard/MatchScoreCard";
import { QuizModal } from "@/components/dashboard/QuizModal";
import { DashboardStep } from "@/components/dashboard/DashboardStep";
import { cn } from "@/lib/cn";

const LEGACY_ANALYSIS_KEY = "gapless:last-jd-analysis";

type StoredAnalysis = {
  jdId: string;
  seniority: string | null;
  result: ComputeGapsResponse;
};

function analysisStorageKey(userId: string): string {
  return `${LEGACY_ANALYSIS_KEY}:${userId}`;
}

function loadStoredAnalysis(userId: string): StoredAnalysis | null {
  try {
    const raw = sessionStorage.getItem(analysisStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAnalysis;
    if (!parsed?.jdId || !parsed.result) return null;
    if (
      !Array.isArray(parsed.result.matched) ||
      !Array.isArray(parsed.result.missing)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveStoredAnalysis(userId: string, value: StoredAnalysis) {
  try {
    sessionStorage.removeItem(LEGACY_ANALYSIS_KEY);
    sessionStorage.setItem(analysisStorageKey(userId), JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function clearStoredAnalysis(userId: string) {
  try {
    sessionStorage.removeItem(LEGACY_ANALYSIS_KEY);
    sessionStorage.removeItem(analysisStorageKey(userId));
  } catch {
    /* ignore */
  }
}

function isMissingJdError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 403 || err.status === 404);
}

export function JdAnalyzeCard({
  userId,
  skillsFingerprint,
}: {
  userId: string;
  skillsFingerprint: string | null;
}) {
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
  const [gapUpdated, setGapUpdated] = useState(false);
  const [gapTab, setGapTab] = useState<"have" | "missing">("missing");
  const skipNextRefreshRef = useRef(false);
  const seenFingerprintRef = useRef<string | null>(null);
  const seniorityRef = useRef(seniority);
  seniorityRef.current = seniority;
  const emptyProfile = skillsFingerprint === "";

  useEffect(() => {
    skipNextRefreshRef.current = false;
    seenFingerprintRef.current = null;
    const stored = loadStoredAnalysis(userId);
    if (!stored) {
      setJdId(null);
      setSeniority(null);
      setResult(null);
      setGapUpdated(false);
      return;
    }
    setJdId(stored.jdId);
    setSeniority(stored.seniority);
    setResult(stored.result);
  }, [userId]);

  const discardAnalysis = useCallback(() => {
    setResult(null);
    setSeniority(null);
    setJdId(null);
    setGapUpdated(false);
    setQuizGap(null);
    clearStoredAnalysis(userId);
  }, [userId]);

  useEffect(() => {
    if (!jdId || skillsFingerprint === null) return;
    if (skipNextRefreshRef.current) {
      skipNextRefreshRef.current = false;
      seenFingerprintRef.current = skillsFingerprint;
      return;
    }

    let cancelled = false;
    const activeJdId = jdId;
    const showUpdated =
      seenFingerprintRef.current !== null &&
      seenFingerprintRef.current !== skillsFingerprint;

    async function refreshGaps() {
      try {
        const gaps = await computeGaps(activeJdId);
        if (cancelled) return;
        setResult(gaps);
        setGapUpdated(showUpdated);
        setQuizGap(null);
        saveStoredAnalysis(userId, {
          jdId: activeJdId,
          seniority: seniorityRef.current,
          result: gaps,
        });
        seenFingerprintRef.current = skillsFingerprint;
      } catch (err) {
        if (cancelled) return;
        if (isMissingJdError(err)) {
          discardAnalysis();
          return;
        }
        setError(
          toUserMessage(err, "Couldn't refresh this gap. Please try again."),
        );
      }
    }

    void refreshGaps();
    return () => {
      cancelled = true;
    };
  }, [jdId, skillsFingerprint, userId, discardAnalysis]);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTrackMessage(null);
    setTrackError(null);
    setPending(true);
    try {
      const parsed = await parseJd(rawText);
      const gaps = await computeGaps(parsed.jd_id);
      skipNextRefreshRef.current = true;
      seenFingerprintRef.current = skillsFingerprint;
      setSeniority(parsed.seniority);
      setResult(gaps);
      setJdId(parsed.jd_id);
      setGapUpdated(false);
      saveStoredAnalysis(userId, {
        jdId: parsed.jd_id,
        seniority: parsed.seniority,
        result: gaps,
      });
    } catch (err) {
      discardAnalysis();
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
      <DashboardStep step={2} title="This job">
      <Card>
        <h3 className="font-serif text-2xl text-navy">
          {result ? "Change this job" : "This job"}
        </h3>
        <p className="mt-2 text-sm text-ink-muted">
          Paste the full posting. We extract skills and compare them to your
          list and your uploaded resume.
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
      </DashboardStep>

      {result ? (
        <DashboardStep step={3} title="For this job">
        <div className="flex flex-col gap-8">
        {emptyProfile && result.matched.length === 0 ? (
          <p className="text-sm text-ink" role="status">
            Your skill list is empty and nothing on the resume matched this
            posting yet, so everything below is a gap until you add what you
            know.
          </p>
        ) : gapUpdated ? (
          <p className="text-sm text-ink" role="status">
            Gap updated to match your current skills and resume.
          </p>
        ) : null}

        <Card>
          <p className="font-serif text-3xl text-navy">
            {typeof result.score === "number" ? `${result.score}% fit` : "Fit"}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {typeof result.matched_count === "number" &&
            typeof result.total_count === "number"
              ? `${result.matched_count} of ${result.total_count} skills overlap.`
              : `${result.matched.length} of ${result.matched.length + result.missing.length} skills overlap.`}{" "}
            Required skills count more than nice-to-haves. Skills evidenced
            only on your resume still count as overlap.
          </p>
          {typeof result.score === "number" ? (
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={result.score}
              aria-label="Fit score"
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${result.score}%` }}
              />
            </div>
          ) : null}
        </Card>

        <div
          className="grid h-10 grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1 lg:hidden"
          role="tablist"
          aria-label="Skill gap sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={gapTab === "missing"}
            className={cn(
              "h-8 rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              gapTab === "missing"
                ? "bg-accent-muted text-navy"
                : "text-ink-muted hover:text-ink",
            )}
            onClick={() => setGapTab("missing")}
          >
            Missing
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={gapTab === "have"}
            className={cn(
              "h-8 rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              gapTab === "have"
                ? "bg-accent-muted text-navy"
                : "text-ink-muted hover:text-ink",
            )}
            onClick={() => setGapTab("have")}
          >
            Have
          </button>
        </div>

        <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-2">
          <div
            className={cn(
              gapTab === "have" ? "block" : "hidden",
              "min-w-0 lg:order-1 lg:block",
            )}
          >
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
                {emptyProfile && result.matched.length === 0
                  ? "Add skills above or upload a resume to see what already matches this job."
                  : result.matched.length === 0
                    ? "Nothing on this posting overlaps your list or resume yet."
                    : `${result.matched.length} from this posting match your list or your uploaded resume. Be ready to talk about them.`}
              </p>
            </div>
            {result.matched.length === 0 ? null : (
              <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2">
                {result.matched.map((item) => (
                  <li
                    key={item.name}
                    className="inline-flex max-w-full min-w-0 flex-col gap-1 rounded-md border border-line bg-canvas px-3 py-1 text-sm text-ink"
                  >
                    <span className="min-w-0 break-words">{item.name}</span>
                    <span
                      className={
                        item.match_source === "resume"
                          ? "text-xs text-accent"
                          : "text-xs text-ink-muted"
                      }
                    >
                      {item.match_source === "resume"
                        ? "On your resume"
                        : "On your skill list"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          </div>
          <div
            className={cn(
              gapTab === "missing" ? "block" : "hidden",
              "min-w-0 lg:order-2 lg:block",
            )}
          >
          <Card className="flex h-full flex-col">
            <div className="flex min-w-0 flex-col gap-3">
              <h3 className="font-serif text-xl text-navy">
                Skills you’re missing
              </h3>
              <p className="text-sm text-ink-muted">
                {result.missing.length === 0
                  ? "No extra skills called out beyond what you already have."
                  : emptyProfile
                    ? `${result.missing.length} on this posting. Quiz to start covering them, or add skills above if you already have some.`
                    : `${result.missing.length} to cover. Quiz from your notes, or rehearse with Interview Prep.`}
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
        </div>
        <div>
          <h3 className="font-serif text-xl text-navy">What to do next</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Quiz a gap, tighten how you write overlap on the resume, save the
            role, then rehearse.
          </p>
        </div>
        {jdId ? (
          <MatchScoreCard
            key={`${jdId}:${result.matched.map((item) => item.id).join(",")}:${result.missing.map((item) => item.id).join(",")}`}
            jdId={jdId}
          />
        ) : null}
        <Card>
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="font-medium text-ink">Save this role to Tracker</p>
              <p className="mt-1 text-sm text-ink-muted">
                Keep it on your board so this gap stays with the application.
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
        {jdId ? (
          <InterviewPrepCard
            jdId={jdId}
            emptyProfile={emptyProfile}
            resumeSkillNames={result.matched
              .filter((item) => item.match_source === "resume")
              .map((item) => item.name)}
            matchedNames={result.matched.map((item) => item.name)}
            missingNames={result.missing.map((item) => item.name)}
            onJdAccessDenied={discardAnalysis}
          />
        ) : null}
        </div>
        </DashboardStep>
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
