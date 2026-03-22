import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionLogType, type PrismaClient } from "@prisma/client";
import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
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
  dbDir = mkdtempSync(path.join(os.tmpdir(), "fwf-environments-tests-"));
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
  await prisma.$disconnect();
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
  await prisma.environment.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
  getSessionMock.mockReset();
  getActiveTenantIdCookieMock.mockReset();
  getActiveTenantIdCookieMock.mockResolvedValue(null);
  clearRateLimitBucketsForTests();
});

async function createUser(email = "u1@example.com") {
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

async function createMembershipWithRole(params: {
  userId: string;
  tenantId: string;
  roleName: string;
  withEnvironmentsRead?: boolean;
  withEnvironmentsWrite?: boolean;
  isMaster?: boolean;
}) {
  const role = await prisma.role.create({
    data: {
      tenantId: params.tenantId,
      name: params.roleName,
      isSystem: Boolean(params.isMaster),
    },
  });

  if (params.withEnvironmentsRead) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: "environments",
        action: "read",
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  if (params.withEnvironmentsWrite) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: "environments",
        action: "write",
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

function setSession(userId: string, email = "u1@example.com") {
  const payload: SessionMock = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  getSessionMock.mockResolvedValue(payload);
}

describe("environments api routes (integration)", () => {
  it("GET /api/environments returns 401 without session", async () => {
    const route = await import("@/app/api/environments/route");
    const response = await route.GET(new Request("http://localhost/api/environments"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/environments blocks users without environments:read permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "VIEWER",
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/route");
    const response = await route.GET(new Request("http://localhost/api/environments"));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("GET /api/environments returns items for read users", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    await prisma.environment.create({
      data: {
        tenantId: tenant.id,
        key: "development",
        name: "Development",
        description: "Default dev environment.",
      },
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/route");
    const response = await route.GET(new Request("http://localhost/api/environments"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.items).toHaveLength(1);
  });

  it("GET /api/environments returns 400 for invalid limit", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/route");
    const response = await route.GET(
      new Request("http://localhost/api/environments?limit=0"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/environments enforces rate limit", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/route");
    let lastStatus = 200;
    let lastRequestId: string | null = null;
    for (let index = 0; index < 121; index += 1) {
      const response = await route.GET(new Request("http://localhost/api/environments"));
      lastStatus = response.status;
      lastRequestId = response.headers.get("x-request-id");
    }

    expect(lastStatus).toBe(429);
    expect(lastRequestId).toBeTruthy();
  });

  it("POST /api/environments denies users without write permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withEnvironmentsRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/route");
    const response = await route.POST(
      new Request("http://localhost/api/environments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: "staging",
          name: "Staging",
          description: "Staging",
          enabled: true,
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("POST /api/environments creates and logs for write users", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "EDITOR",
      withEnvironmentsWrite: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/route");
    const response = await route.POST(
      new Request("http://localhost/api/environments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: "staging",
          name: "Staging",
          description: "Staging environment",
          enabled: true,
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.item.key).toBe("staging");

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "environment",
        actionType: ActionLogType.CREATE,
      },
    });
    expect(log).not.toBeNull();
  });

  it("PATCH /api/environments/[environmentId] updates and logs for write users", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "EDITOR",
      withEnvironmentsWrite: true,
    });
    const environment = await prisma.environment.create({
      data: {
        tenantId: tenant.id,
        key: "development",
        name: "Development",
        description: "Dev",
      },
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/[environmentId]/route");
    const response = await route.PATCH(
      new Request(`http://localhost/api/environments/${environment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Development Updated",
          enabled: false,
        }),
      }),
      { params: Promise.resolve({ environmentId: environment.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.item.name).toBe("Development Updated");
    expect(json.item.enabled).toBe(false);

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "environment",
        actionType: ActionLogType.UPDATE,
      },
    });
    expect(log).not.toBeNull();
  });

  it("PATCH /api/environments/[environmentId] denies users without write permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withEnvironmentsRead: true,
    });
    const environment = await prisma.environment.create({
      data: {
        tenantId: tenant.id,
        key: "development",
        name: "Development",
      },
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/environments/[environmentId]/route");
    const response = await route.PATCH(
      new Request(`http://localhost/api/environments/${environment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Blocked",
        }),
      }),
      { params: Promise.resolve({ environmentId: environment.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
