import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "About · Gapless",
  description:
    "Gapless is an India-first job-search copilot: paste a posting, see your skill gap, study from your notes, and track the role.",
};

const FEATURES = [
  {
    title: "Skills",
    body: "Type what you know, or upload a resume (PDF or text) and review before we save. That list is your live profile. Clear it and the job on screen is all gap until you add skills again.",
  },
  {
    title: "Analyze a job",
    body: "Paste the full posting. We extract required skills and seniority, then show what you already have versus what you are missing.",
  },
  {
    title: "Tracker",
    body: "Save the role to a board: applied, interviewing, offer, or rejected. The gap stays with the application you chose to track.",
  },
  {
    title: "Notes",
    body: "Upload what you actually studied. A quiz for a skill only uses notes that match that skill. No Docker notes means we ask you to add some — we will not quiz Docker from a JWT file.",
  },
  {
    title: "Interview prep",
    body: "Rehearsal questions for this posting: defend skills you have, cover the gaps. It is practice, not a scored exam.",
  },
] as const;

const SESSION = [
  "Create an account and confirm your email.",
  "On Dashboard, add skills (or upload a resume).",
  "Paste a job description and analyze it.",
  "Read have vs missing. Quiz a gap from your notes, or generate interview questions.",
  "Track the role on the board if you applied.",
] as const;

const NOT_LIST = [
  "An ATS keyword scanner or resume theatre tool.",
  "Auto-apply or a job-board scraper.",
  "A generic chatbot or “chat with any PDF.”",
  "A stand-in for that company’s real interview loop.",
] as const;

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl text-navy md:text-4xl">
          Prep for the job you actually pasted.
        </h1>
        <p className="mt-6 text-base text-ink md:text-lg">
          Gapless is an India-first job-search copilot. You paste a posting, we
          show the skill gap against what you already know, then you study and
          track that role — not a generic problem list.
        </p>
      </div>

      <div className="mt-12 max-w-3xl">
        <h2 className="font-serif text-2xl text-navy">Who it is for</h2>
        <p className="mt-4 text-base text-ink">
          Early-career software engineers (about 0–5 years) applying to product
          companies and startups in India, already used to English tools. If you
          are drowning in LeetCode but the JD asked for Kafka and your notes are
          on JWT, that mismatch is the product.
        </p>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-2xl text-navy">What you can do</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <Card key={item.title}>
              <h3 className="font-serif text-xl text-navy">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="mt-12 max-w-3xl">
        <h2 className="font-serif text-2xl text-navy">How a first session looks</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-base text-ink">
          {SESSION.map((step) => (
            <li key={step} className="min-w-0 break-words pl-1">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-12 max-w-3xl">
        <h2 className="font-serif text-2xl text-navy">What Gapless is not</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-ink">
          {NOT_LIST.map((item) => (
            <li key={item} className="min-w-0 break-words pl-1">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 max-w-3xl">
        <h2 className="font-serif text-2xl text-navy">Your data, simply</h2>
        <p className="mt-4 text-base text-ink">
          You sign in with email. Job text, resume-derived skills, notes, and
          quizzes stay on your account. The browser talks to Gapless, not to the
          database or the AI vendor directly. Confirm-email mail may show a
          generic sender until custom mail is configured — the{" "}
          <Link
            href="/faq"
            className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            FAQ
          </Link>{" "}
          covers that.
        </p>
      </div>

      <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row sm:items-center">
        <Button href="/signin" className="w-full sm:w-auto">
          Create an account
        </Button>
        <Button href="/faq" variant="secondary" className="w-full sm:w-auto">
          Read the FAQ
        </Button>
      </div>
    </section>
  );
}
