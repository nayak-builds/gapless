import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-end md:justify-between md:px-6">
        <div className="min-w-0 max-w-md">
          <Link
            href="/"
            className="inline-block font-serif text-xl text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Gapless
          </Link>
          <p className="mt-2 min-w-0 break-words text-sm text-ink-muted">
            India-first prep for the job you pasted — not a generic LeetCode
            list.
          </p>
        </div>
        <nav
          className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2"
          aria-label="About Gapless"
        >
          <Link
            href="/about"
            className="rounded-sm px-1 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            About
          </Link>
          <Link
            href="/faq"
            className="rounded-sm px-1 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            FAQ
          </Link>
        </nav>
      </div>
    </footer>
  );
}
