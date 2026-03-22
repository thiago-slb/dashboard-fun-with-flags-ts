type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
  resetAt: number;
  provider: "memory" | "upstash";
};

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) : RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, {
      count: 1,
      resetAt,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: 0,
      limit,
      resetAt,
      provider: "memory",
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      limit,
      resetAt: existing.resetAt,
      provider: "memory",
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
    limit,
    resetAt: existing.resetAt,
    provider: "memory",
  };
}

async function upstashCommand(args: Array<string | number>) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([args]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Rate limit provider error.");
  }

  const json = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  const first = json[0];
  if (!first || first.error) {
    throw new Error(first?.error ?? "Rate limit provider error.");
  }

  return first.result;
}

export async function consumeRateLimitServer(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return consumeRateLimit(key, limit, windowMs);
  }

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const namespacedKey = `rl:${key}`;
  try {
    const countRaw = await upstashCommand(["INCR", namespacedKey]);
    const count = Number(countRaw);
    if (!Number.isFinite(count)) {
      return consumeRateLimit(key, limit, windowMs);
    }

    if (count === 1) {
      await upstashCommand(["EXPIRE", namespacedKey, windowSeconds]);
    }

    const ttlRaw = await upstashCommand(["TTL", namespacedKey]);
    const ttlSeconds = Number(ttlRaw);
    const safeTtl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : windowSeconds;
    const resetAt = Date.now() + safeTtl * 1000;

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: safeTtl,
        limit,
        resetAt,
        provider: "upstash",
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: 0,
      limit,
      resetAt,
      provider: "upstash",
    };
  } catch {
    return consumeRateLimit(key, limit, windowMs);
  }
}

export function clearRateLimitBucketsForTests() {
  buckets.clear();
}
