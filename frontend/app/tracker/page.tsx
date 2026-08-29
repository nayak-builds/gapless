"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/tracker/KanbanBoard";
import { Card } from "@/components/ui/Card";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function TrackerPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          router.replace("/signin");
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          router.replace("/signin");
        }
      }
    }

    void guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        <h1 className="font-serif text-3xl text-navy">Tracker</h1>
        <Card className="mt-8">
          <p className="text-ink-muted">Checking your session…</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <div>
        <h1 className="font-serif text-3xl text-navy">Tracker</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Move applications between columns as their status changes.
        </p>
      </div>
      <KanbanBoard />
    </section>
  );
}
