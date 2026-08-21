"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function SiteHeader() {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";
  const onSignIn = pathname === "/signin";

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="font-serif text-xl text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Gapless
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Primary">
          <Link
            href="/dashboard"
            className={cn(
              "px-3 text-sm font-medium",
              onDashboard ? "text-accent" : "text-ink-muted hover:text-ink",
            )}
          >
            Dashboard
          </Link>
          {onDashboard ? (
            <Button variant="secondary" type="button">
              Sign out
            </Button>
          ) : (
            <Button variant={onSignIn ? "secondary" : "primary"} href="/signin">
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
