import { cookies } from "next/headers";

const ACTIVE_TENANT_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-fwf_tenant" : "fwf_tenant";

const ACTIVE_TENANT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getActiveTenantIdCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_TENANT_COOKIE_NAME)?.value ?? null;
}

export async function setActiveTenantCookie(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE_NAME, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearActiveTenantCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_TENANT_COOKIE_NAME);
}
