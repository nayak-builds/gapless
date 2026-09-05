import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <Link
          href="/"
          className="w-fit shrink-0 font-serif text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Gapless
        </Link>
        <p className="min-w-0 max-w-xl break-words text-sm text-ink-muted">
          India-first prep for the job you pasted — not a generic LeetCode list.
        </p>
      </div>
    </footer>
  );
}
