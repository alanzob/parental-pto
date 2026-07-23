import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

const CATEGORIES = ["bug", "feature", "general"];
const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug report",
  feature: "Feature idea",
  general: "General feedback",
};

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isRateLimited(`contact:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  const category = CATEGORIES.includes(body.category) ? body.category : "general";
  const message = body.message.trim().slice(0, 4000);
  const submittedEmail =
    typeof body.email === "string" && body.email.trim() ? body.email.trim().slice(0, 320) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from("beta_feedback").insert({
    user_id: user?.id ?? null,
    email: submittedEmail ?? user?.email ?? null,
    category,
    message,
  });

  if (error) {
    return NextResponse.json({ error: "Could not submit feedback." }, { status: 500 });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    const email = submittedEmail ?? user?.email;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**${CATEGORY_LABELS[category]}**${email ? ` from ${email}` : ""}\n${message.slice(0, 1800)}`,
        }),
      });
    } catch {
      // Best-effort — Discord being down shouldn't fail the submission,
      // which is already safely stored in beta_feedback.
    }
  }

  return NextResponse.json({ ok: true });
}
