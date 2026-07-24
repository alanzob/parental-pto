import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

// Creates the account pre-confirmed via the Admin API (email_confirm: true),
// so it never touches Supabase's email pipeline at all — sidesteps both the
// project's "Confirm email" setting (wherever that's landed in the
// dashboard this week) and the built-in email rate limit entirely. The
// client signs in separately right after with signInWithPassword.
//
// Because this goes through the Admin API, it also bypasses Supabase's own
// signup rate limiting — nothing else stood between this endpoint and
// someone scripting unlimited account creation, hence the rate limit below.
export async function POST(request: Request) {
  if (MAINTENANCE_MODE) {
    return NextResponse.json({ error: "MyTO is paused right now." }, { status: 503 });
  }

  const ip = clientIp(request);
  if (isRateLimited(`signup:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 },
    );
  }

  const { email, password, fullName } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    ...(typeof fullName === "string" && fullName.trim()
      ? { user_metadata: { full_name: fullName.trim() } }
      : {}),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
