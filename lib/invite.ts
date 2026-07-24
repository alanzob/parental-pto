import { createServiceRoleClient } from "@/lib/supabase/server";

export type InvitePreview = {
  householdName: string;
  inviterName: string | null;
};

/** Read-only preview of an invite code for an unauthenticated visitor —
 * just enough to say "Join The Walsh Household" before they've signed in.
 * Bypasses RLS deliberately (households/invitations are member-scoped),
 * so it only ever returns a name, never anything else from either row. */
export async function lookupInvitePreview(code: string): Promise<InvitePreview | null> {
  const svc = createServiceRoleClient();

  const { data: invite } = await svc
    .from("invitations")
    .select("household_id, status, expires_at, created_by")
    .eq("invite_code", code)
    .maybeSingle();

  if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
    return null;
  }

  const [{ data: household }, { data: inviter }] = await Promise.all([
    svc.from("households").select("name").eq("id", invite.household_id).maybeSingle(),
    svc.from("profiles").select("display_name").eq("id", invite.created_by).maybeSingle(),
  ]);

  return {
    householdName: household?.name ?? "their household",
    inviterName: inviter?.display_name ?? null,
  };
}
