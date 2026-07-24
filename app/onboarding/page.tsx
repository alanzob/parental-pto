import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { lookupInvitePreview } from "@/lib/invite";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (profile?.household_id) redirect("/dashboard");

  const invite = code ? await lookupInvitePreview(code) : null;

  return <OnboardingForm initialCode={code} invite={invite} />;
}
