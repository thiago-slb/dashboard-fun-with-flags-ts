import type { RateLimitResult } from "@/lib/security/rate-limit";

export function buildRateLimitHeaders(rateLimit: RateLimitResult) {
  const headers = new Headers();
  headers.set("x-ratelimit-limit", String(rateLimit.limit));
  headers.set("x-ratelimit-remaining", String(Math.max(0, rateLimit.remaining)));
  headers.set("x-ratelimit-reset", String(Math.floor(rateLimit.resetAt / 1000)));
  headers.set("x-ratelimit-provider", rateLimit.provider);
  if (!rateLimit.allowed) {
    headers.set("retry-after", String(rateLimit.retryAfterSeconds));
  }
  return headers;
}

export function buildNoStoreHeaders() {
  const headers = new Headers();
  headers.set("cache-control", "no-store");
  return headers;
}

export function mergeHeaders(...items: Array<Headers | Record<string, string> | undefined>) {
  const merged = new Headers();
  for (const item of items) {
    if (!item) {
      continue;
    }
    const source = item instanceof Headers ? item : new Headers(item);
    source.forEach((value, key) => {
      merged.set(key, value);
    });
  }
  return merged;
}
