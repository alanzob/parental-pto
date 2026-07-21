import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Most commonly: the link was opened in a different browser/device than
  // it was requested from (PKCE code verifier lives in that browser only).
  // The login page's OTP-code fallback covers this case.
  return NextResponse.redirect(
    `${origin}/login?error=auth_link_failed`,
  );
}
