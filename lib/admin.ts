// Server-only. Never expose the admin allowlist to the client (no
// NEXT_PUBLIC_ prefix) — an env var shipped in the client bundle can be
// read by anyone, which defeats the point of an email allowlist gate.
//
// ADMIN_EMAILS is a comma-separated list, e.g. "me@example.com,you@example.com".
// Falls back to the older singular ADMIN_EMAIL for backward compatibility
// with an already-configured deployment.
function adminEmails(): string[] {
  const list = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
