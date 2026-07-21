import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, household_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) redirect("/onboarding");

  const [
    { data: household },
    { data: profiles },
    { data: balances },
    { data: transactions },
    { data: conversions },
  ] = await Promise.all([
    supabase
      .from("households")
      .select("*")
      .eq("id", profile.household_id)
      .single(),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", profile.household_id),
    supabase
      .from("pto_balances")
      .select("*")
      .eq("household_id", profile.household_id),
    supabase
      .from("pto_transactions")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("occurred_at", { ascending: false })
      .limit(25),
    supabase
      .from("pto_conversions")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("created_at", { ascending: false }),
  ]);

  const partner = (profiles ?? []).find((p) => p.id !== user.id) ?? null;
  const me = (profiles ?? []).find((p) => p.id === user.id) ?? profile;

  return (
    <DashboardClient
      me={me}
      partner={partner}
      household={household!}
      balances={balances ?? []}
      transactions={transactions ?? []}
      conversions={conversions ?? []}
    />
  );
}
