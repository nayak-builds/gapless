"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JdAnalyzeCard } from "@/components/dashboard/JdAnalyzeCard";
import { SkillsCard } from "@/components/dashboard/SkillsCard";
import { Card } from "@/components/ui/Card";
import { createSupabaseBrowserClient } from "@/lib/supabase";

function skillsFingerprint(names: string[]): string {
  return names
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("\0");
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [skillsKey, setSkillsKey] = useState<string | null>(null);

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
        setUserId(user.id);
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
        <h1 className="font-serif text-3xl text-navy">Dashboard</h1>
        <Card className="mt-8">
          <p className="text-ink-muted">Checking your session…</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <div>
        <h1 className="font-serif text-3xl text-navy">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Add what you already know, paste a job, see the gap.
        </p>
      </div>
      <SkillsCard
        onSkillsChanged={(names) => {
          setSkillsKey(skillsFingerprint(names));
        }}
      />
      {userId ? (
        <JdAnalyzeCard userId={userId} skillsFingerprint={skillsKey} />
      ) : null}
    </section>
  );
}
