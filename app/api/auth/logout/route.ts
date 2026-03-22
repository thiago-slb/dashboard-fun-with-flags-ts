import { NextResponse } from "next/server";
import { logoutSuccessResponseSchema } from "@/lib/auth/schemas";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();

  const payload = logoutSuccessResponseSchema.parse({
    success: true,
  });

  return NextResponse.json(payload);
}
