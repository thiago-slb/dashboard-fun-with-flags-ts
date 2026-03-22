import { describe, expect, it } from "vitest";
import {
  clearRateLimitBucketsForTests,
  consumeRateLimit,
} from "@/lib/security/rate-limit";

describe("consumeRateLimit", () => {
  it("blocks requests after limit in window", () => {
    clearRateLimitBucketsForTests();

    const first = consumeRateLimit("k1", 2, 60_000);
    const second = consumeRateLimit("k1", 2, 60_000);
    const third = consumeRateLimit("k1", 2, 60_000);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps isolated buckets per key", () => {
    clearRateLimitBucketsForTests();
    const firstKey = consumeRateLimit("a", 1, 60_000);
    const secondKey = consumeRateLimit("b", 1, 60_000);
    expect(firstKey.allowed).toBe(true);
    expect(secondKey.allowed).toBe(true);
  });
});
