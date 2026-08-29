"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  generateQuiz,
  submitQuiz,
  toUserMessage,
  type QuizQuestion,
  type SubmitQuizResponse,
} from "@/lib/api";
import { cn } from "@/lib/cn";

type QuizModalProps = {
  gapId: string;
  skillName: string;
  onClose: () => void;
};

export function QuizModal({ gapId, skillName, onClose }: QuizModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noNotes, setNoNotes] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitQuizResponse | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNoNotes(false);
      setResult(null);
      try {
        const quiz = await generateQuiz(gapId);
        if (cancelled) return;
        setQuestions(quiz.questions);
        setAnswers(quiz.questions.map(() => null));
      } catch (err) {
        if (cancelled) return;
        const message = toUserMessage(
          err,
          "Couldn't generate a quiz. Please try again.",
        );
        setNoNotes(
          message.toLowerCase().includes("no notes found for this skill"),
        );
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [gapId]);

  const allAnswered =
    questions.length > 0 && answers.every((value) => value !== null);

  async function handleSubmit() {
    if (!allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const submitted = await submitQuiz(
        gapId,
        questions,
        answers.map((value) => value as number),
      );
      setResult(submitted);
    } catch (err) {
      setError(toUserMessage(err, "Couldn't submit this quiz. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <Card>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 id="quiz-title" className="font-serif text-2xl text-navy">
                Quiz: {skillName}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Questions are drawn from your notes for this skill.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={onClose}
            >
              Close
            </Button>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-ink-muted">Generating quiz…</p>
          ) : null}

          {error ? (
            <div className="mt-6 flex flex-col gap-4" role="alert">
              <p className="text-sm text-danger">{error}</p>
              {noNotes ? (
                <Button href="/notes" className="w-full sm:w-auto">
                  Add notes
                </Button>
              ) : null}
            </div>
          ) : null}

          {!loading && !error && !result ? (
            <div className="mt-6 flex flex-col gap-6">
              {questions.map((question, qIndex) => (
                <fieldset key={`${qIndex}-${question.prompt.slice(0, 24)}`} className="min-w-0">
                  <legend className="text-sm font-medium text-ink">
                    {qIndex + 1}. {question.prompt}
                  </legend>
                  <div className="mt-3 flex flex-col gap-2">
                    {question.options.map((option, oIndex) => {
                      const selected = answers[qIndex] === oIndex;
                      return (
                        <button
                          key={`${qIndex}-${oIndex}`}
                          type="button"
                          className={cn(
                            "min-w-0 break-words rounded-md border px-3 py-2 text-left text-sm",
                            selected
                              ? "border-accent bg-accent-muted text-ink"
                              : "border-line bg-surface text-ink hover:bg-accent-muted",
                          )}
                          onClick={() =>
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[qIndex] = oIndex;
                              return next;
                            })
                          }
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!allAnswered || submitting}
                aria-busy={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Submitting…" : "Submit Quiz"}
              </Button>
            </div>
          ) : null}

          {result ? (
            <div className="mt-6 flex flex-col gap-6">
              <p className="text-sm text-ink" role="status">
                Score: {result.score} / {result.total} ({result.percent}%)
              </p>
              {questions.map((question, qIndex) => {
                const item = result.results[qIndex];
                if (!item) return null;
                return (
                  <div key={`result-${qIndex}`} className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {qIndex + 1}. {question.prompt}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        item.is_correct ? "text-success" : "text-danger",
                      )}
                    >
                      {item.is_correct ? "Correct" : "Incorrect"} — you chose “
                      {question.options[item.selected_index]}”
                      {!item.is_correct
                        ? `. Correct: “${question.options[item.correct_index]}”`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">{item.explanation}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
