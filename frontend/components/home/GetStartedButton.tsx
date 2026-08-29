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
      <Button type="button" disabled>
        Get Started
      </Button>
    );
  }

  return <Button href={href}>Get Started</Button>;
}
