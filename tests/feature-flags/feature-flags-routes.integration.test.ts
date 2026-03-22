import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionLogType, type PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { clearRateLimitBucketsForTests } from "@/lib/security/rate-limit";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/active-tenant", () => ({
  getActiveTenantIdCookie: vi.fn(),
  setActiveTenantCookie: vi.fn(),
  clearActiveTenantCookie: vi.fn(),
}));

type SessionMock = {
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

let prisma: PrismaClient;
let dbDir = "";
let dbUrl = "";
let getSessionMock: ReturnType<typeof vi.fn>;
let getActiveTenantIdCookieMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  dbDir = mkdtempSync(path.join(os.tmpdir(), "fwf-feature-flags-tests-"));
  const dbPath = path.join(dbDir, "test.db");
  dbUrl = `file:${dbPath.replace(/\\/g, "/")}`;
  process.env.DATABASE_URL = dbUrl;

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
    stdio: "pipe",
  });

  vi.resetModules();
  const prismaModule = await import("@/lib/prisma");
  prisma = prismaModule.prisma;

  const sessionModule = await import("@/lib/auth/session");
  const activeTenantModule = await import("@/lib/auth/active-tenant");

  getSessionMock = vi.mocked(sessionModule.getSession);
  getActiveTenantIdCookieMock = vi.mocked(activeTenantModule.getActiveTenantIdCookie);
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  if (dbDir) {
    rmSync(dbDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  await prisma.actionLog.deleteMany();
  await prisma.membershipRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.role.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
  getSessionMock.mockReset();
  getActiveTenantIdCookieMock.mockReset();
  getActiveTenantIdCookieMock.mockResolvedValue(null);
  clearRateLimitBucketsForTests();
});

async function createUser(email = "feature-flags@example.com") {
  return prisma.user.create({
    data: {
      email,
      name: "User",
      passwordHash: "hashed",
    },
  });
}

async function createTenant(name: string, slug: string) {
  return prisma.tenant.create({
    data: { name, slug },
  });
}

async function createEnvironment(tenantId: string, key: string, name: string) {
  return prisma.environment.create({
    data: {
      tenantId,
      key,
      name,
    },
  });
}

async function createMembershipWithRole(params: {
  userId: string;
  tenantId: string;
  roleName: string;
  withFeatureFlagsRead?: boolean;
  withFeatureFlagsWrite?: boolean;
}) {
  const role = await prisma.role.create({
    data: {
      tenantId: params.tenantId,
      name: params.roleName,
      isSystem: false,
    },
  });

  if (params.withFeatureFlagsRead) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: PERMISSIONS.featureFlagsRead.resource,
        action: PERMISSIONS.featureFlagsRead.action,
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  if (params.withFeatureFlagsWrite) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: PERMISSIONS.featureFlagsWrite.resource,
        action: PERMISSIONS.featureFlagsWrite.action,
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  const membership = await prisma.membership.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
    },
  });

  await prisma.membershipRole.create({
    data: { membershipId: membership.id, roleId: role.id },
  });

  return membership;
}

function setSession(userId: string, email = "feature-flags@example.com") {
  const payload: SessionMock = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  getSessionMock.mockResolvedValue(payload);
}

describe("feature flags api routes (integration)", () => {
  it("GET /api/feature-flags returns 401 without session", async () => {
    const route = await import("@/app/api/feature-flags/route");
    const response = await route.GET(new Request("http://localhost/api/feature-flags"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/feature-flags blocks users without feature_flags:read", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "VIEWER",
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/feature-flags/route");
    const response = await route.GET(new Request("http://localhost/api/feature-flags"));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("GET /api/feature-flags returns paginated items and excludes soft deleted flags", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withFeatureFlagsRead: true,
    });

    await prisma.featureFlag.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        key: "checkout_old",
        name: "Checkout Old",
        rolloutPercent: 10,
        enabled: true,
      },
    });

    await prisma.featureFlag.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        key: "checkout_new",
        name: "Checkout New",
        rolloutPercent: 100,
        enabled: false,
        deletedAt: new Date(),
      },
    });

    setSession(user.id, user.email);

    const route = await import("@/app/api/feature-flags/route");
    const response = await route.GET(
      new Request("http://localhost/api/feature-flags?limit=20&q=checkout"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0]?.key).toBe("checkout_old");
  });

  it("POST /api/feature-flags creates flag and action log with write permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "WRITER",
      withFeatureFlagsWrite: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/feature-flags/route");
    const response = await route.POST(
      new Request("http://localhost/api/feature-flags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: environment.id,
          key: "payments_canary",
          name: "Payments Canary",
          description: "Enable new payments flow.",
          rolloutPercent: 25,
          enabled: true,
          allowListEmails: ["  Team@Example.com  ", "team@example.com"],
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.item.key).toBe("payments_canary");
    expect(json.item.allowListEmails).toEqual(["team@example.com"]);

    const actionLog = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        actionType: ActionLogType.CREATE,
        resource: "feature_flag",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(actionLog).toBeTruthy();
  });

  it("DELETE /api/feature-flags/[flagId] performs soft delete", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "WRITER",
      withFeatureFlagsWrite: true,
    });

    const flag = await prisma.featureFlag.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        key: "search_revamp",
        name: "Search Revamp",
        enabled: true,
      },
    });

    setSession(user.id, user.email);

    const route = await import("@/app/api/feature-flags/[flagId]/route");
    const response = await route.DELETE(
      new Request(`http://localhost/api/feature-flags/${flag.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ flagId: flag.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.id).toBe(flag.id);

    const updated = await prisma.featureFlag.findUnique({
      where: { id: flag.id },
      select: { deletedAt: true, enabled: true },
    });

    expect(updated?.deletedAt).toBeTruthy();
    expect(updated?.enabled).toBe(false);
  });
});
