import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// Detaches an account from its household. Their own balance/history rows
// stay put (tied to the old household_id) — same as when a partner leaves
// via self-service deletion. If they were the household's only member, the
// now-empty household is removed.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = body?.userId;
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const svc = createServiceRoleClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("id, household_id")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No such account." }, { status: 404 });
  }
  if (!profile.household_id) {
    return NextResponse.json({ ok: true });
  }

  const householdId = profile.household_id;
  await svc.from("profiles").update({ household_id: null }).eq("id", userId);

  const { count } = await svc
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  if ((count ?? 0) === 0) {
    await svc.from("households").delete().eq("id", householdId);
  }

  return NextResponse.json({ ok: true });
}
