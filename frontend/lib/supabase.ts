import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env.local and restart the Next.js server.",
    );
  }

  return { url, anonKey };
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }
  const { url, anonKey } = getSupabaseBrowserEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
