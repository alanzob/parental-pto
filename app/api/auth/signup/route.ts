import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Creates the account pre-confirmed via the Admin API (email_confirm: true),
// so it never touches Supabase's email pipeline at all — sidesteps both the
// project's "Confirm email" setting (wherever that's landed in the
// dashboard this week) and the built-in email rate limit entirely. The
// client signs in separately right after with signInWithPassword.
export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
