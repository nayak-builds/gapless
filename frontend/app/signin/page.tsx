"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SignInPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <section className="mx-auto flex max-w-6xl justify-center px-4 py-16 md:px-6">
      <Card className="w-full max-w-md">
        <h1 className="font-serif text-3xl text-navy">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Use your email and password to continue.
        </p>
        <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
          />
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
          />
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/signin"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </Card>
    </section>
  );
}
