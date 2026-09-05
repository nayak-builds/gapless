import { GetStartedButton } from "@/components/home/GetStartedButton";
import { Card } from "@/components/ui/Card";

const STEPS = [
  {
    n: "1",
    title: "Your skills",
    body: "List what you know, or upload a resume.",
  },
  {
    n: "2",
    title: "This job",
    body: "Paste the full posting. We extract skills and compare.",
  },
  {
    n: "3",
    title: "The gap",
    body: "See have vs missing, rehearse questions, track the role.",
  },
] as const;

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start px-4 py-16 md:items-center md:px-6 md:text-center">
      <h1 className="max-w-3xl font-serif text-3xl leading-tight text-navy sm:text-4xl md:text-5xl">
        Paste a job. See the real gap. Study only what&apos;s missing.
      </h1>
      <p className="mt-6 max-w-2xl text-base text-ink-muted md:text-lg">
        For Indian engineers (about 0–5 years) applying to product companies —
        prep tied to that posting, not a generic LeetCode list.
      </p>
      <div className="mt-8 w-full sm:w-auto">
        <GetStartedButton />
      </div>

      <div className="mt-12 w-full md:mt-16 md:text-left">
        <p className="text-sm font-medium text-ink-muted">How it works</p>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.n} className="min-w-0 text-left">
              <p className="text-sm text-accent">{step.n}</p>
              <h2 className="mt-2 font-serif text-xl text-navy">{step.title}</h2>
              <p className="mt-2 min-w-0 break-words text-sm text-ink-muted">
                {step.body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
