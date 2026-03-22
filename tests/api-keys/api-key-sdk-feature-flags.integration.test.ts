import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { hashApiKeyForStorage } from "@/lib/api-keys/crypto";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/active-tenant", () => ({
  getActiveTenantIdCookie: vi.fn(),
  setActiveTenantCookie: vi.fn(),
  clearActiveTenantCookie: vi.fn(),
}));

let prisma: PrismaClient;
let dbDir = "";
let dbUrl = "";

beforeAll(async () => {
  dbDir = mkdtempSync(path.join(os.tmpdir(), "fwf-api-key-sdk-tests-"));
  const dbPath = path.join(dbDir, "test.db");
  dbUrl = `file:${dbPath.replace(/\\/g, "/")}`;
  process.env.DATABASE_URL = dbUrl;
  process.env.API_KEY_PEPPER = "test-pepper";

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      API_KEY_PEPPER: "test-pepper",
    },
    stdio: "pipe",
  });

  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  prisma = prismaModule.prisma;
});

afterAll(async () => {
  await prisma.$disconnect();
  if (dbDir) {
    rmSync(dbDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  await prisma.featureFlag.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.membershipRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.role.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
});

describe("api key sdk route (integration)", () => {
  it("GET /api/sdk/feature-flags requires api key", async () => {
    const route = await import("@/app/api/sdk/feature-flags/route");
    const response = await route.GET(new Request("http://localhost/api/sdk/feature-flags"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("MISSING_API_KEY");
  });

  it("GET /api/sdk/feature-flags authenticates api key, filters by environment and updates lastUsedAt", async () => {
    const user = await prisma.user.create({
      data: {
        email: "sdk@example.com",
        name: "SDK",
        passwordHash: "hashed",
      },
    });
    const tenant = await prisma.tenant.create({
      data: {
        name: "Tenant",
        slug: "tenant-sdk",
      },
    });
    const dev = await prisma.environment.create({
      data: {
        tenantId: tenant.id,
        key: "development",
        name: "Development",
      },
    });
    const prod = await prisma.environment.create({
      data: {
        tenantId: tenant.id,
        key: "production",
        name: "Production",
      },
    });

    await prisma.featureFlag.create({
      data: {
        tenantId: tenant.id,
        environmentId: dev.id,
        key: "new_checkout",
        name: "New Checkout",
        enabled: true,
      },
    });
    await prisma.featureFlag.create({
      data: {
        tenantId: tenant.id,
        environmentId: prod.id,
        key: "payment_retry",
        name: "Payment Retry",
        enabled: true,
      },
    });

    const rawApiKey = "fwf_test_key_sdk_123456789";
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: dev.id,
        createdByUserId: user.id,
        name: "SDK Dev",
        keyPrefix: rawApiKey.slice(0, 14),
        secretHash: hashApiKeyForStorage(rawApiKey),
        canReadFeatureFlags: true,
      },
      select: {
        id: true,
        lastUsedAt: true,
      },
    });
    expect(apiKey.lastUsedAt).toBeNull();

    const route = await import("@/app/api/sdk/feature-flags/route");
    const response = await route.GET(
      new Request("http://localhost/api/sdk/feature-flags", {
        headers: { "x-api-key": rawApiKey },
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0]?.environmentKey).toBe("development");
    expect(json.items[0]?.key).toBe("new_checkout");

    const updated = await prisma.apiKey.findUnique({
      where: { id: apiKey.id },
      select: { lastUsedAt: true },
    });
    expect(updated?.lastUsedAt).not.toBeNull();
  });
});
