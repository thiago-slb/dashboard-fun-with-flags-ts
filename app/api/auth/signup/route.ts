import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { setActiveTenantCookie } from "@/lib/auth/active-tenant";
import { existsUserWithMaxLevelRole } from "@/lib/auth/bootstrap";
import { ensureTenantDefaultPermissions } from "@/lib/auth/permissions";
import {
  signUpErrorResponseSchema,
  signUpInputSchema,
  signUpSuccessResponseSchema,
} from "@/lib/auth/schemas";
import {
  DEVELOPMENT_ENVIRONMENT_DESCRIPTION_BY_LOCALE,
  DEVELOPMENT_ENVIRONMENT_NAME_BY_LOCALE,
  PRODUCTION_ENVIRONMENT_DESCRIPTION_BY_LOCALE,
  PRODUCTION_ENVIRONMENT_NAME_BY_LOCALE,
  resolveLocaleFromAcceptLanguage,
  STAGING_ENVIRONMENT_DESCRIPTION_BY_LOCALE,
  STAGING_ENVIRONMENT_NAME_BY_LOCALE,
} from "@/lib/environments/default-development";
import { setSessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = signUpErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });

  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = signUpInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid sign-up data.");
  }

  const { name, email, password } = parsedInput.data;
  const locale = resolveLocaleFromAcceptLanguage(
    request.headers.get("accept-language"),
  );

  const hasMasterUser = await existsUserWithMaxLevelRole();
  if (hasMasterUser) {
    return jsonError(
      409,
      "MASTER_ALREADY_EXISTS",
      "A master user already exists.",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return jsonError(409, "EMAIL_ALREADY_EXISTS", "Email already in use.");
  }

  const passwordHash = await hash(password, 12);

  const createdUser = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: "Primary Workspace",
        slug: `primary-${crypto.randomUUID().slice(0, 12)}`,
      },
      select: { id: true },
    });

    const role = await tx.role.create({
      data: {
        tenantId: tenant.id,
        name: MASTER_ROLE_NAME,
        description: "Master role with full access.",
        isSystem: true,
      },
      select: { id: true },
    });

    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
      },
      select: { id: true },
    });

    await tx.membershipRole.create({
      data: {
        membershipId: membership.id,
        roleId: role.id,
      },
    });

    await ensureTenantDefaultPermissions(tx, tenant.id, role.id);

    await tx.environment.create({
      data: {
        tenantId: tenant.id,
        key: "development",
        name: DEVELOPMENT_ENVIRONMENT_NAME_BY_LOCALE[locale],
        description: DEVELOPMENT_ENVIRONMENT_DESCRIPTION_BY_LOCALE[locale],
        createdByUserId: user.id,
      },
    });

    await tx.environment.create({
      data: {
        tenantId: tenant.id,
        key: "staging",
        name: STAGING_ENVIRONMENT_NAME_BY_LOCALE[locale],
        description: STAGING_ENVIRONMENT_DESCRIPTION_BY_LOCALE[locale],
        createdByUserId: user.id,
      },
    });

    await tx.environment.create({
      data: {
        tenantId: tenant.id,
        key: "production",
        name: PRODUCTION_ENVIRONMENT_NAME_BY_LOCALE[locale],
        description: PRODUCTION_ENVIRONMENT_DESCRIPTION_BY_LOCALE[locale],
        createdByUserId: user.id,
      },
    });

    return {
      ...user,
      tenantId: tenant.id,
    };
  });

  await setSessionCookie({
    userId: createdUser.id,
    email: createdUser.email,
  });
  await setActiveTenantCookie(createdUser.tenantId);

  const response = signUpSuccessResponseSchema.parse({
    success: true,
    user: createdUser,
  });

  return NextResponse.json(response, { status: 201 });
}
