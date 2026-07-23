import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackRow } from "@/components/admin/feedback-row";
import { UsersPanel, type AdminUserRow } from "@/components/admin/users-panel";

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted rounded-md p-4">
      <p className="label-tag text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/dashboard");
  }

  const serviceClient = createServiceRoleClient();

  const [
    { count: totalUsers },
    { data: profiles },
    { data: households },
    { data: authUsers },
    { data: requests },
    { data: feedback },
    { data: errors },
  ] = await Promise.all([
    serviceClient.from("profiles").select("id", { count: "exact", head: true }),
    serviceClient.from("profiles").select("id, display_name, household_id"),
    serviceClient.from("households").select("id, partner_mode, manual_partner_name"),
    serviceClient.auth.admin.listUsers({ perPage: 200 }).then((r) => ({ data: r.data.users })),
    serviceClient.from("pto_transactions").select("household_id, created_at"),
    serviceClient
      .from("beta_feedback")
      .select("*")
      .order("resolved", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100),
    serviceClient.from("error_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  // A household is "paired" once it has two profiles in it.
  const householdMemberCounts = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (!p.household_id) continue;
    householdMemberCounts.set(p.household_id, (householdMemberCounts.get(p.household_id) ?? 0) + 1);
  }
  const pairedHouseholds = Array.from(householdMemberCounts.values()).filter((n) => n >= 2).length;

  // "Active" = logged at least one request in the window. Approvals don't
  // insert a new row, so this undercounts approval-only activity — a
  // reasonable proxy given the app's scale, not a precise metric.
  const now = new Date().getTime();
  const activeHouseholds = (windowMs: number) => {
    const cutoff = now - windowMs;
    const ids = new Set(
      (requests ?? [])
        .filter((r) => new Date(r.created_at).getTime() >= cutoff)
        .map((r) => r.household_id),
    );
    return ids.size;
  };

  const totalRequests = requests?.length ?? 0;
  const feedbackList = feedback ?? [];
  const unresolvedCount = feedbackList.filter((f) => !f.resolved).length;

  const householdsById = new Map((households ?? []).map((h) => [h.id, h]));
  const profilesByHousehold = new Map<string, NonNullable<typeof profiles>>();
  for (const p of profiles ?? []) {
    if (!p.household_id) continue;
    const arr = profilesByHousehold.get(p.household_id) ?? [];
    arr.push(p);
    profilesByHousehold.set(p.household_id, arr);
  }
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const userRows: AdminUserRow[] = (authUsers ?? [])
    .map((au) => {
      const profile = profileById.get(au.id);
      const householdId = profile?.household_id ?? null;
      const household = householdId ? householdsById.get(householdId) : undefined;
      const members = householdId ? (profilesByHousehold.get(householdId) ?? []) : [];
      const partner = members.find((m) => m.id !== au.id);
      return {
        id: au.id,
        email: au.email ?? null,
        displayName: profile?.display_name ?? null,
        householdId,
        partnerMode: household?.partner_mode ?? null,
        manualPartnerName: household?.manual_partner_name ?? null,
        memberCount: members.length,
        partnerLabel: partner ? (partner.display_name ?? null) : null,
      };
    })
    .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Admin</h2>
        <p className="text-muted-foreground text-sm">Growth metrics, feedback, and error log.</p>
      </div>

      <div>
        <h3 className="label-tag text-muted-foreground mb-2">Growth</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="Users signed up" value={totalUsers ?? 0} />
          <MetricCard label="Paired households" value={pairedHouseholds} />
          <MetricCard label="Active households (24h)" value={activeHouseholds(24 * 60 * 60 * 1000)} />
          <MetricCard label="Active households (7d)" value={activeHouseholds(7 * 24 * 60 * 60 * 1000)} />
          <MetricCard label="Total events logged" value={totalRequests} />
          <MetricCard label="Open feedback" value={unresolvedCount} />
        </div>
      </div>

      <div>
        <h3 className="label-tag text-muted-foreground mb-2">Users</h3>
        <p className="text-muted-foreground mb-2 text-xs">
          Pairing moves someone into another household; it doesn&apos;t migrate their existing
          balance or history, which stays with the household they left. Delete is permanent.
        </p>
        <UsersPanel users={userRows} />
      </div>

      <div>
        <h3 className="label-tag text-muted-foreground mb-2">Feedback inbox</h3>
        {feedbackList.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              No feedback yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {feedbackList.map((f) => (
                <FeedbackRow
                  key={f.id}
                  id={f.id}
                  category={f.category}
                  message={f.message}
                  email={f.email}
                  createdAt={f.created_at}
                  resolved={f.resolved}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="label-tag text-muted-foreground mb-2">Error log</h3>
        {!errors || errors.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              No errors reported yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {errors.map((e) => (
                <div key={e.id} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm font-medium">{e.message}</p>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                  {e.path && <p className="text-muted-foreground font-mono text-xs">{e.path}</p>}
                  {e.stack && (
                    <pre className="bg-muted overflow-x-auto rounded p-2 text-[10px] leading-snug">
                      {e.stack}
                    </pre>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
