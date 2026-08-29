import { GetStartedButton } from "@/components/home/GetStartedButton";

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start px-4 py-16 md:items-center md:px-6 md:text-center">
      <h1 className="max-w-3xl font-serif text-3xl leading-tight text-navy sm:text-4xl md:text-5xl">
        Paste a job description, see your real skill gap, and study exactly
        what&apos;s missing.
      </h1>
      <p className="mt-6 max-w-2xl text-base text-ink-muted md:text-lg">
        Gapless is an India-first job-search copilot for engineers who want
        prep tied to the roles they are actually applying to.
      </p>
      <div className="mt-8">
        <GetStartedButton />
      </div>
    </section>
  );
}
