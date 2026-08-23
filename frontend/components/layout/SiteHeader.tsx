"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname === "/dashboard";
  const onSignIn = pathname === "/signin";
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = createSupabaseBrowserClient();

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled) {
          setEmail(session?.user.email ?? null);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
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
          {email ? (
            <>
              <span className="hidden text-sm text-ink-muted sm:inline">
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
