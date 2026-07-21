// In-memory, per-instance rate limiting — no external dependency, good
// enough for this app's scale. Not distributed: under Vercel's serverless
// model, separate concurrent instances have separate buckets, so this is
// a soft cap, not an airtight one. If this app gets popular enough that
// matters, swap for a real store (e.g. Upstash Redis).
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= maxAttempts) {
    buckets.set(key, recent);
    return true;
  }

  recent.push(now);
  buckets.set(key, recent);
  return false;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
