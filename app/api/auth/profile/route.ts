import { NextResponse } from "next/server";
import {
  signUpErrorResponseSchema,
  updateProfileInputSchema,
  updateProfileSuccessResponseSchema,
} from "@/lib/auth/schemas";
import { getSession, setSessionCookie } from "@/lib/auth/session";
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

  const parsedInput = updateProfileInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid profile data.");
  }

  const existingWithEmail = await prisma.user.findFirst({
    where: {
      email: parsedInput.data.email,
      id: {
        not: session.userId,
      },
    },
    select: { id: true },
  });

  if (existingWithEmail) {
    return jsonError(409, "EMAIL_ALREADY_EXISTS", "Email already in use.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: parsedInput.data.name,
      email: parsedInput.data.email,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  await setSessionCookie({
    userId: updatedUser.id,
    email: updatedUser.email,
  });

  const payload = updateProfileSuccessResponseSchema.parse({
    success: true,
    user: updatedUser,
  });

  return NextResponse.json(payload);
}
