"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export function GetStartedButton() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveHref() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setHref(user ? "/dashboard" : "/signin");
        }
      } catch {
        if (!cancelled) {
          setHref("/signin");
        }
      }
    }

    void resolveHref();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!href) {
    return (
      <Button type="button" className="w-full sm:w-auto" disabled>
        See your skill gap
      </Button>
    );
  }

  return (
    <Button className="w-full sm:w-auto" href={href}>
      See your skill gap
    </Button>
  );
}
