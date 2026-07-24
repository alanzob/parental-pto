import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

// Optimistic auth check only (session cookie, no DB query) — Next.js
// guidance is to keep Proxy fast since it runs on every route, including
// prefetches. The "does this user have a household yet?" check lives in
// app/dashboard/layout.tsx instead, close to the data it needs.

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MyTO — paused</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #fafaf8; color: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; text-align: center; }
  @media (prefers-color-scheme: dark) { body { background: #0f1214; color: #f5f5f5; } }
  h1 { font-size: 1.375rem; margin: 0 0 0.5rem; }
  p { color: #767671; max-width: 26rem; margin: 0 auto; line-height: 1.5; }
</style>
</head>
<body>
  <div>
    <h1>MyTO is paused</h1>
    <p>The app is offline for now. Nothing was deleted — it'll be back.</p>
  </div>
</body>
</html>`;

export async function proxy(request: NextRequest) {
  // Next requires `config.matcher` below to stay a static literal, so this
  // check lives here instead — it still covers every page a visitor could
  // reach (login, demo, dashboard, onboarding, about, all of it). The few
  // API routes the matcher already excludes (feed/log-error/contact) are
  // inert without a UI pointing at them; signup gets its own guard directly
  // in its route handler since it's the one that actually matters.
  if (MAINTENANCE_MODE) {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|api/feed|api/auth|api/log-error|api/contact).*)",
  ],
};
