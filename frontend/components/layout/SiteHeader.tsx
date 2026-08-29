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
          className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2 md:gap-4"
          aria-label="Primary"
        >
          <Link
            href="/dashboard"
            className={cn(
              "px-2 text-sm font-medium sm:px-3",
              onDashboard ? "text-accent" : "text-ink-muted hover:text-ink",
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/tracker"
            className={cn(
              "px-2 text-sm font-medium sm:px-3",
              onTracker ? "text-accent" : "text-ink-muted hover:text-ink",
            )}
          >
            Tracker
          </Link>
          {email ? (
            <>
              <span className="hidden max-w-48 truncate text-sm text-ink-muted md:inline lg:max-w-xs">
                {email}
              </span>
              <Button
                variant="secondary"
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                Sign out
              </Button>
            </>
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
