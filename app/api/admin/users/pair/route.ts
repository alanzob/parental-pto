import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

async function memberCount(svc: ReturnType<typeof createServiceRoleClient>, householdId: string) {
  const { count } = await svc
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);
  return count ?? 0;
}

// Pairs two accounts into one household. If both already belong to
// households, the second user's household is treated as the one being
// left — its balance/history stays behind, exactly like a self-service
// account deletion leaves a departing partner's history with the
// household. This is a structural fix-up tool, not a data migration tool.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userIdA = body?.userIdA;
  const userIdB = body?.userIdB;
  if (typeof userIdA !== "string" || typeof userIdB !== "string" || userIdA === userIdB) {
    return NextResponse.json({ error: "Pick two different people." }, { status: 400 });
  }

  const svc = createServiceRoleClient();

  const { data: profiles, error: profilesError } = await svc
    .from("profiles")
    .select("id, household_id")
    .in("id", [userIdA, userIdB]);

  if (profilesError || !profiles || profiles.length !== 2) {
    return NextResponse.json({ error: "Could not find both accounts." }, { status: 404 });
  }

  const profileA = profiles.find((p) => p.id === userIdA)!;
  const profileB = profiles.find((p) => p.id === userIdB)!;

  if (profileA.household_id && profileA.household_id === profileB.household_id) {
    return NextResponse.json({ error: "They're already paired." }, { status: 400 });
  }

  if (!profileA.household_id && !profileB.household_id) {
    const { data: household, error: createError } = await svc
      .from("households")
      .insert({})
      .select("id")
      .single();
    if (createError || !household) {
      return NextResponse.json({ error: "Could not create a household." }, { status: 500 });
    }
    await svc.from("profiles").update({ household_id: household.id }).in("id", [userIdA, userIdB]);
    await svc
      .from("pto_balances")
      .upsert(
        [
          { household_id: household.id, user_id: userIdA },
          { household_id: household.id, user_id: userIdB },
        ],
        { onConflict: "household_id,user_id", ignoreDuplicates: true },
      );
    return NextResponse.json({ ok: true });
  }

  const targetHouseholdId = profileA.household_id ?? profileB.household_id!;
  const movingUserId = profileA.household_id ? userIdB : userIdA;
  const oldHouseholdId = profileA.household_id ? profileB.household_id : profileA.household_id;

  const existingCount = await memberCount(svc, targetHouseholdId);
  if (existingCount >= 2) {
    return NextResponse.json({ error: "That household already has two people." }, { status: 400 });
  }

  await svc.from("profiles").update({ household_id: targetHouseholdId }).eq("id", movingUserId);
  await svc
    .from("pto_balances")
    .upsert(
      { household_id: targetHouseholdId, user_id: movingUserId },
      { onConflict: "household_id,user_id", ignoreDuplicates: true },
    );

  if (oldHouseholdId) {
    const remaining = await memberCount(svc, oldHouseholdId);
    if (remaining === 0) {
      await svc.from("households").delete().eq("id", oldHouseholdId);
    }
  }

  return NextResponse.json({ ok: true });
}
