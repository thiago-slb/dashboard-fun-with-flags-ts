import { NextResponse } from "next/server";
import { clearActiveTenantCookie } from "@/lib/auth/active-tenant";
import { logoutSuccessResponseSchema } from "@/lib/auth/schemas";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  await clearActiveTenantCookie();

  const payload = logoutSuccessResponseSchema.parse({
    success: true,
  });

  return NextResponse.json(payload);
}
