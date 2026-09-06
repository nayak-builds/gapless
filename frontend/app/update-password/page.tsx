"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setHasUser(Boolean(user));
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setHasUser(false);
          setReady(true);
        }
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-16 md:px-6">
      <Card className="w-full max-w-md">
        <h1 className="font-serif text-3xl text-navy">Set a new password</h1>
        {!ready ? (
          <p className="mt-2 text-sm text-ink-muted">Checking your reset link…</p>
        ) : !hasUser ? (
          <>
            <p className="mt-2 text-sm text-ink-muted" role="alert">
              This reset link is invalid or expired. Request a new one. Open the
              email on the same browser you used to ask for the reset.
            </p>
            <p className="mt-6">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Request a new reset link
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              Choose a password you do not use on other sites.
            </p>
            <form
              className="mt-8 flex flex-col gap-6"
              onSubmit={(e) => void handleSubmit(e)}
            >
              <Input
                id="new-password"
                name="password"
                type="password"
                label="New password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={pending}
              />
              <Input
                id="confirm-password"
                name="confirm"
                type="password"
                label="Confirm password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={pending}
              />
              {error ? (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Saving…" : "Save password"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </section>
  );
}
