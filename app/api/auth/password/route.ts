import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import {
  signUpErrorResponseSchema,
  updatePasswordInputSchema,
  updatePasswordSuccessResponseSchema,
} from "@/lib/auth/schemas";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function jsonError(status: number, code: string, message: string) {
  const payload = signUpErrorResponseSchema.parse({
    success: false,
    error: { code, message },
  });

  return NextResponse.json(payload, { status });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "You must be authenticated.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Invalid request body.");
  }

  const parsedInput = updatePasswordInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid password data.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return jsonError(404, "NOT_FOUND", "User not found.");
  }

  const validCurrentPassword = await compare(
    parsedInput.data.currentPassword,
    user.passwordHash,
  );

  if (!validCurrentPassword) {
    return jsonError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect.");
  }

  const newPasswordHash = await hash(parsedInput.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
    },
  });

  const payload = updatePasswordSuccessResponseSchema.parse({
    success: true,
  });

  return NextResponse.json(payload);
}
