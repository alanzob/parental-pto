import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Optimistic auth check only (session cookie, no DB query) — Next.js
// guidance is to keep Proxy fast since it runs on every route, including
// prefetches. The "does this user have a household yet?" check lives in
// app/dashboard/layout.tsx instead, close to the data it needs.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/feed).*)"],
};
