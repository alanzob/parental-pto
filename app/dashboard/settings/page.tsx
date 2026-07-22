import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
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

  const [{ data: household }, { data: invitations }, { data: profiles }] = await Promise.all([
    supabase.from("households").select("*").eq("id", profile.household_id).single(),
    supabase
      .from("invitations")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id").eq("household_id", profile.household_id),
  ]);

  const hasRealPartner = (profiles ?? []).some((p) => p.id !== user.id);

  return (
    <SettingsClient
      me={profile}
      household={household!}
      invitations={invitations ?? []}
      hasRealPartner={hasRealPartner}
    />
  );
}
