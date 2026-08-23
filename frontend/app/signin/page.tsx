"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type AuthMode = "signin" | "signup";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === "signup";

  function toggleMode() {
    setMode(isSignUp ? "signin" : "signup");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");

    try {
      const supabase = createSupabaseBrowserClient();
      const result = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (isSignUp && !result.data.session) {
        setError(
          "Account created. Confirm your email, then sign in. For local testing you can turn off Confirm email in the Supabase Auth settings.",
        );
        return;
      }

      if (!result.data.session) {
        setError("Could not start a session. Try signing in again.");
        return;
      }

      router.push("/dashboard");
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
        <h1 className="font-serif text-3xl text-navy">
          {isSignUp ? "Sign up" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {isSignUp
            ? "Create an account with your email and password."
            : "Use your email and password to continue."}
        </p>
        <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            disabled={pending}
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
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
            {pending
              ? isSignUp
                ? "Creating account…"
                : "Signing in…"
              : isSignUp
                ? "Sign Up"
                : "Sign In"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          {isSignUp ? "Already have an account? " : "Don\u2019t have an account? "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={toggleMode}
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </Card>
    </section>
  );
}
