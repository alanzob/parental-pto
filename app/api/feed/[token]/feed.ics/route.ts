import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildIcsFeed } from "@/lib/calendar/ics";

export const runtime = "nodejs";

// Public, unauthenticated by design — calendar apps can't log in. The
// high-entropy token in the URL IS the credential (same trust model as
// Google/Apple's own "secret address" ICS links). See households
// .calendar_feed_token and regenerate_calendar_feed_token() in the
// migration for how it's issued/rotated.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createServiceRoleClient();

  const { data: household } = await supabase
    .from("households")
    .select("id, name")
    .eq("calendar_feed_token", token)
    .single();

  if (!household) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: profiles }, { data: transactions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("household_id", household.id),
    supabase
      .from("pto_transactions")
      .select("*")
      .eq("household_id", household.id)
      .eq("status", "completed")
      .eq("transaction_type", "request")
      .order("occurred_at", { ascending: false })
      .limit(500),
  ]);

  const displayNameByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? "Someone"]),
  );

  const { value, error } = buildIcsFeed(
    household.name,
    transactions ?? [],
    displayNameByUserId,
  );

  if (error || !value) {
    return new Response("Failed to build calendar feed", { status: 500 });
  }

  return new Response(value, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="parental-pto.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
