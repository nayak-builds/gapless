import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectToForgot(request: NextRequest, error: "missing" | "invalid") {
  const dest = request.nextUrl.clone();
  dest.pathname = "/forgot-password";
  dest.search = `error=${error}`;
  dest.hash = "";
  return NextResponse.redirect(dest);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirectToForgot(request, "missing");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!supabaseUrl || !anonKey) {
    return redirectToForgot(request, "invalid");
  }

  const successUrl = request.nextUrl.clone();
  successUrl.pathname = "/update-password";
  successUrl.search = "";
  successUrl.hash = "";
  const redirect = NextResponse.redirect(successUrl);

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          redirect.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectToForgot(request, "invalid");
  }

  return redirect;
}
