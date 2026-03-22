import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionLogType, type PrismaClient } from "@prisma/client";
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
  dbDir = mkdtempSync(path.join(os.tmpdir(), "fwf-api-keys-tests-"));
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
  await prisma.apiKey.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();
  getSessionMock.mockReset();
  getActiveTenantIdCookieMock.mockReset();
  getActiveTenantIdCookieMock.mockResolvedValue(null);
  clearRateLimitBucketsForTests();
});

async function createUser(email = "api-keys@example.com") {
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
  withApiKeysRead?: boolean;
  withApiKeysWrite?: boolean;
}) {
  const role = await prisma.role.create({
    data: {
      tenantId: params.tenantId,
      name: params.roleName,
      isSystem: false,
    },
  });

  if (params.withApiKeysRead) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: "api_keys",
        action: "read",
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  if (params.withApiKeysWrite) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: "api_keys",
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

function setSession(userId: string, email = "api-keys@example.com") {
  const payload: SessionMock = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  getSessionMock.mockResolvedValue(payload);
}

describe("api keys api routes (integration)", () => {
  it("GET /api/api-keys returns 401 without session", async () => {
    const route = await import("@/app/api/api-keys/route");
    const response = await route.GET(new Request("http://localhost/api/api-keys"));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/api-keys blocks users without api_keys:read permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "VIEWER",
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    const response = await route.GET(new Request("http://localhost/api/api-keys"));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("GET /api/api-keys returns paginated items and ignores soft-deleted ones", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withApiKeysRead: true,
    });

    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        name: "A",
        keyPrefix: "fwf_a",
        secretHash: "hash-a",
      },
    });

    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        name: "B",
        keyPrefix: "fwf_b",
        secretHash: "hash-b",
        deletedAt: new Date(),
      },
    });

    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    const response = await route.GET(new Request("http://localhost/api/api-keys?limit=20"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0]?.name).toBe("A");
  });

  it("GET /api/api-keys returns 400 for invalid limit", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withApiKeysRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    const response = await route.GET(new Request("http://localhost/api/api-keys?limit=0"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/api-keys supports search and environment filter", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const dev = await createEnvironment(tenant.id, "development", "Development");
    const stg = await createEnvironment(tenant.id, "staging", "Staging");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withApiKeysRead: true,
    });

    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: dev.id,
        name: "CI Key",
        keyPrefix: "fwf_ci",
        secretHash: "hash-ci",
      },
    });

    await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: stg.id,
        name: "Mobile Key",
        keyPrefix: "fwf_mobile",
        secretHash: "hash-mobile",
      },
    });

    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    const response = await route.GET(
      new Request(
        `http://localhost/api/api-keys?limit=20&q=ci&environmentId=${dev.id}`,
      ),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.items[0]?.name).toBe("CI Key");
  });

  it("GET /api/api-keys enforces rate limit", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withApiKeysRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    let lastStatus = 200;
    let lastRequestId: string | null = null;

    for (let index = 0; index < 121; index += 1) {
      const response = await route.GET(new Request("http://localhost/api/api-keys"));
      lastStatus = response.status;
      lastRequestId = response.headers.get("x-request-id");
    }

    expect(lastStatus).toBe(429);
    expect(lastRequestId).toBeTruthy();
  });

  it("POST /api/api-keys denies users without write permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withApiKeysRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    const response = await route.POST(
      new Request("http://localhost/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: environment.id,
          name: "Integration",
          canReadFeatureFlags: true,
          canWriteFeatureFlags: false,
          canReadEnvironments: false,
          canWriteEnvironments: false,
          canReadProjects: false,
          canWriteProjects: false,
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

  it("POST /api/api-keys creates key and logs create action", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "EDITOR",
      withApiKeysWrite: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/route");
    const response = await route.POST(
      new Request("http://localhost/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: environment.id,
          name: "Integration",
          canReadFeatureFlags: true,
          canWriteFeatureFlags: false,
          canReadEnvironments: false,
          canWriteEnvironments: false,
          canReadProjects: false,
          canWriteProjects: false,
          enabled: true,
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(typeof json.apiKey).toBe("string");

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "api_key",
        actionType: ActionLogType.CREATE,
      },
    });
    expect(log).not.toBeNull();
  });

  it("PATCH /api/api-keys/[apiKeyId] updates and logs action", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "EDITOR",
      withApiKeysWrite: true,
    });

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        name: "Before",
        keyPrefix: "fwf_before",
        secretHash: "hash-before",
      },
    });

    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/[apiKeyId]/route");
    const response = await route.PATCH(
      new Request(`http://localhost/api/api-keys/${apiKey.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "After", enabled: false }),
      }),
      { params: Promise.resolve({ apiKeyId: apiKey.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.item.name).toBe("After");
    expect(json.item.enabled).toBe(false);

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "api_key",
        actionType: ActionLogType.UPDATE,
      },
    });
    expect(log).not.toBeNull();
  });

  it("DELETE /api/api-keys/[apiKeyId] soft-deletes and logs action", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    const environment = await createEnvironment(tenant.id, "development", "Development");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "EDITOR",
      withApiKeysWrite: true,
    });

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        environmentId: environment.id,
        name: "To Remove",
        keyPrefix: "fwf_delete",
        secretHash: "hash-delete",
        enabled: true,
      },
    });

    setSession(user.id, user.email);

    const route = await import("@/app/api/api-keys/[apiKeyId]/route");
    const response = await route.DELETE(
      new Request(`http://localhost/api/api-keys/${apiKey.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ apiKeyId: apiKey.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);

    const stored = await prisma.apiKey.findUnique({ where: { id: apiKey.id } });
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.enabled).toBe(false);

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "api_key",
        actionType: ActionLogType.DELETE,
      },
    });
    expect(log).not.toBeNull();
  });
});
