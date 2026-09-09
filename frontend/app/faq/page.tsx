import type { Metadata } from "next";
import Link from "next/link";
import { FaqItem } from "@/components/marketing/FaqItem";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "FAQ · Gapless",
  description:
    "Answers about Gapless: who it is for, how analyze and quizzes work, and how your account stays private.",
};

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl text-navy">FAQ</h1>
        <p className="mt-4 text-base text-ink-muted">
          Short answers. For the full story, see{" "}
          <Link
            href="/about"
            className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            About
          </Link>
          .
        </p>

        <h2 className="mt-12 font-serif text-2xl text-navy">Getting started</h2>
        <div className="mt-4">
          <FaqItem question="What is Gapless?">
            <p>
              An India-first job-search copilot: paste a job, see the skill gap
              against what you know, study from your notes, and track the role.
              Read the{" "}
              <Link
                href="/about"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                About
              </Link>{" "}
              page for the full loop.
            </p>
          </FaqItem>
          <FaqItem question="Who is it for?">
            <p>
              Software engineers in India, roughly 0–5 years of experience,
              applying to product companies and startups. The UI is in English.
            </p>
          </FaqItem>
          <FaqItem question="How do I start?">
            <p>
              <Link
                href="/signin"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Sign up
              </Link>
              , confirm your email, then open{" "}
              <Link
                href="/dashboard"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Dashboard
              </Link>
              . Add skills first, then paste a job and analyze it.
            </p>
          </FaqItem>
          <FaqItem question="Is it free?">
            <p>
              Yes for this product as offered. We cap how long a job description
              can be and how often you can call the AI so the service stays
              usable.
            </p>
          </FaqItem>
        </div>

        <h2 className="mt-12 font-serif text-2xl text-navy">Using Gapless</h2>
        <div className="mt-4">
          <FaqItem question="Do I need a resume?">
            <p>
              No. Typing skills is enough. A resume upload is a shortcut: you
              review the extracted skills before we save them.
            </p>
          </FaqItem>
          <FaqItem question="What does Analyze do?">
            <p>
              It reads the posting you pasted, lists required skills and
              seniority, then compares that list to your skills. You get “already
              have” and “missing.”
            </p>
          </FaqItem>
          <FaqItem question="I cleared my skills and everything is missing.">
            <p>
              That is intended. An empty skill list means this posting is all
              gap until you add what you know. Add skills above the job to see
              overlap.
            </p>
          </FaqItem>
          <FaqItem question="What is the Tracker?">
            <p>
              A kanban for roles you choose to save: applied, interviewing,
              offer, rejected. It does not read Gmail or auto-update status.
            </p>
          </FaqItem>
        </div>

        <h2 className="mt-12 font-serif text-2xl text-navy">Notes and quizzes</h2>
        <div className="mt-4">
          <FaqItem question="Will a FastAPI quiz use my JWT notes?">
            <p>
              No. Quizzes need notes for that skill. Add a FastAPI note on{" "}
              <Link
                href="/notes"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Notes
              </Link>
              , or you will see “No notes found for this skill yet.”
            </p>
          </FaqItem>
          <FaqItem question="Interview Prep vs Quiz?">
            <p>
              Interview Prep is rehearsal for this job (skills you have vs
              gaps). A Quiz is scored questions from your notes on one missing
              skill.
            </p>
          </FaqItem>
        </div>

        <h2 className="mt-12 font-serif text-2xl text-navy">Account</h2>
        <div className="mt-4">
          <FaqItem question="Why does confirm-email say Supabase Auth?">
            <p>
              That is the default mail sender. The message is still for Gapless.
              Check spam. After you confirm, sign in as usual.
            </p>
          </FaqItem>
          <FaqItem question="Can other people see my JDs or notes?">
            <p>
              No. Each account only sees its own jobs, skills, notes, quizzes,
              and tracker.
            </p>
          </FaqItem>
          <FaqItem question="I never got the email.">
            <p>
              Check spam, wait a minute, and try signing up again with the same
              address you used. Use that inbox when you confirm, then sign in.
            </p>
          </FaqItem>
        </div>

        <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row sm:items-center">
          <Button href="/about" variant="secondary" className="w-full sm:w-auto">
            About Gapless
          </Button>
          <Button href="/signin" className="w-full sm:w-auto">
            Sign in
          </Button>
        </div>
      </div>
    </section>
  );
}
