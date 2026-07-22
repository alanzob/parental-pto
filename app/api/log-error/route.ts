import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { clientIp, isRateLimited } from "@/lib/rate-limit";

// Fed by app/error.tsx and app/global-error.tsx. Deliberately tolerant of
// unauthenticated callers (an error on the login page still needs to be
// logged) — capped by IP rate limiting rather than an auth check, since
// there's no session to check on some of the pages that report here.
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isRateLimited(`log-error:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  await supabase.from("error_logs").insert({
    message: body.message.slice(0, 2000),
    stack: typeof body.stack === "string" ? body.stack.slice(0, 4000) : null,
    digest: typeof body.digest === "string" ? body.digest.slice(0, 200) : null,
    path: typeof body.path === "string" ? body.path.slice(0, 500) : null,
  });

  return NextResponse.json({ ok: true });
}
