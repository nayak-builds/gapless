"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname === "/dashboard";
  const onTracker = pathname === "/tracker";
  const onNotes = pathname === "/notes";
  const onSignIn = pathname === "/signin";
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = createSupabaseBrowserClient();

      void supabase.auth.getSession().then((result) => {
        if (!cancelled) {
          setEmail(result.data.session?.user.email ?? null);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        setEmail(session?.user.email ?? null);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      setEmail(null);
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const linkClass = (active: boolean) =>
    cn(
      "rounded-sm px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-3",
      active ? "text-accent" : "text-ink-muted hover:text-ink",
    );

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-6">
        <Link
          href="/"
          className="shrink-0 font-serif text-xl text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Gapless
        </Link>

        <nav
          className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1 sm:gap-2"
          aria-label="Primary"
        >
          <Link
            href="/dashboard"
            className={linkClass(onDashboard)}
            aria-current={onDashboard ? "page" : undefined}
          >
            Dashboard
          </Link>
          <Link
            href="/tracker"
            className={linkClass(onTracker)}
            aria-current={onTracker ? "page" : undefined}
          >
            Tracker
          </Link>
          <Link
            href="/notes"
            className={linkClass(onNotes)}
            aria-current={onNotes ? "page" : undefined}
          >
            Notes
          </Link>
          {email ? (
            <Button
              variant="secondary"
              type="button"
              className="shrink-0"
              title={email}
              aria-label={`Sign out ${email}`}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          ) : (
            <Button
              variant={onSignIn ? "secondary" : "primary"}
              className="shrink-0"
              href="/signin"
            >
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
