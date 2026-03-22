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
  dbDir = mkdtempSync(path.join(os.tmpdir(), "fwf-projects-tests-"));
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
  withProjectsRead?: boolean;
  withProjectsWrite?: boolean;
  isMaster?: boolean;
}) {
  const role = await prisma.role.create({
    data: {
      tenantId: params.tenantId,
      name: params.roleName,
      isSystem: Boolean(params.isMaster),
    },
  });

  if (params.withProjectsRead) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: "projects",
        action: "read",
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
  }

  if (params.withProjectsWrite) {
    const permission = await prisma.permission.create({
      data: {
        tenantId: params.tenantId,
        resource: "projects",
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

describe("projects api routes (integration)", () => {
  it("GET /api/projects returns 400 for invalid limit", async () => {
    const user = await createUser();
    const tenant = await createTenant("One", "one");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/route");
    const response = await route.GET(
      new Request("http://localhost/api/projects?limit=0"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/projects enforces rate limit", async () => {
    const user = await createUser();
    const tenant = await createTenant("One", "one");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/route");
    let lastStatus = 200;
    let lastRequestId: string | null = null;
    for (let index = 0; index < 81; index += 1) {
      const response = await route.GET(new Request("http://localhost/api/projects"));
      lastStatus = response.status;
      lastRequestId = response.headers.get("x-request-id");
    }

    expect(lastStatus).toBe(429);
    expect(lastRequestId).toBeTruthy();
  });

  it("GET /api/projects returns paginated items", async () => {
    const user = await createUser();
    const t1 = await createTenant("One", "one");
    const t2 = await createTenant("Two", "two");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: t1.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    await createMembershipWithRole({
      userId: user.id,
      tenantId: t2.id,
      roleName: MASTER_ROLE_NAME,
      isMaster: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/route");
    const response = await route.GET(
      new Request("http://localhost/api/projects?limit=1"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.nextCursor).not.toBeNull();
  });

  it("POST /api/projects blocks users without projects:write permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "VIEWER",
      withProjectsRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/route");
    const response = await route.POST(
      new Request("http://localhost/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New Project" }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("PATCH /api/projects/[projectId] allows write users and logs update", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "EDITOR",
      withProjectsWrite: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/[projectId]/route");
    const response = await route.PATCH(
      new Request(`http://localhost/api/projects/${tenant.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Tenant Updated" }),
      }),
      { params: Promise.resolve({ projectId: tenant.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.item.name).toBe("Tenant Updated");

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "project",
        actionType: ActionLogType.UPDATE,
      },
    });
    expect(log).not.toBeNull();
  });

  it("PATCH /api/projects/[projectId] denies users without write permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withProjectsRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/[projectId]/route");
    const response = await route.PATCH(
      new Request(`http://localhost/api/projects/${tenant.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Blocked Update" }),
      }),
      { params: Promise.resolve({ projectId: tenant.id }) },
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("POST /api/projects/active requires read access and logs switch", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "READER",
      withProjectsRead: true,
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/active/route");
    const response = await route.POST(
      new Request("http://localhost/api/projects/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: tenant.id }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(true);
    expect(json.projectId).toBe(tenant.id);

    const log = await prisma.actionLog.findFirst({
      where: {
        tenantId: tenant.id,
        resource: "project_active_switch",
      },
    });
    expect(log).not.toBeNull();
  });

  it("POST /api/projects/active denies users without read permission", async () => {
    const user = await createUser();
    const tenant = await createTenant("Tenant", "tenant");
    await createMembershipWithRole({
      userId: user.id,
      tenantId: tenant.id,
      roleName: "NO_ACCESS",
    });
    setSession(user.id, user.email);

    const route = await import("@/app/api/projects/active/route");
    const response = await route.POST(
      new Request("http://localhost/api/projects/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: tenant.id }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
