"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function callbackErrorMessage(code: string | null): string | null {
  if (code === "missing" || code === "invalid") {
    return "This reset link is invalid or expired. Request a new one.";
  }
  return null;
}

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    callbackErrorMessage(searchParams.get("error")),
  );
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Enter the email on your account.");
      setPending(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (resetError) {
        const status = resetError.status;
        if (status === 429) {
          setError("Too many reset emails. Wait a minute and try again.");
          return;
        }
        const lower = resetError.message.toLowerCase();
        if (lower.includes("not found") || lower.includes("unable to find")) {
          setSent(true);
          return;
        }
        setError(resetError.message);
        return;
      }
      setSent(true);
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
        <h1 className="font-serif text-3xl text-navy">Reset password</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter your email. If an account exists, we will send a reset link.
        </p>
        {sent ? (
          <p className="mt-8 text-sm text-ink" role="status">
            If that email is on an account, check your inbox (and spam) for a
            Gapless password reset. The link expires; request a new one if it
            does not work.
          </p>
        ) : (
          <form className="mt-8 flex flex-col gap-6" onSubmit={(e) => void handleSubmit(e)}>
            <Input
              id="reset-email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
              disabled={pending}
            />
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <p className="mt-6 text-sm text-ink-muted">
          <Link
            href="/signin"
            className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Back to sign in
          </Link>
        </p>
      </Card>
    </section>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto flex max-w-6xl justify-center px-4 py-16 md:px-6">
          <Card className="w-full max-w-md">
            <h1 className="font-serif text-3xl text-navy">Reset password</h1>
            <p className="mt-2 text-sm text-ink-muted">Loading…</p>
          </Card>
        </section>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
