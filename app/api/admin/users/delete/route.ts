import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// Mirrors delete_my_account() (migration 0004) but for an arbitrary target,
// since that RPC scopes itself to auth.uid() and can't be pointed at
// someone else. Detaches the account from shared history first (nulling
// initiated_by/user_id rather than cascading, so a departing partner's
// entries don't erase the credit the OTHER partner's balance depends on),
// then deletes the auth user — profiles and pto_balances cascade from that
// via their own FK ON DELETE CASCADE.
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

  await svc.from("pto_transactions").update({ initiated_by: null }).eq("initiated_by", userId);
  await svc.from("pto_transactions").update({ user_id: null }).eq("user_id", userId);
  await svc.from("invitations").delete().eq("created_by", userId);
  await svc.from("invitations").update({ used_by: null }).eq("used_by", userId);

  if (profile?.household_id) {
    const { count } = await svc
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("household_id", profile.household_id)
      .neq("id", userId);
    if ((count ?? 0) === 0) {
      await svc.from("households").delete().eq("id", profile.household_id);
    }
  }

  const { error } = await svc.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
