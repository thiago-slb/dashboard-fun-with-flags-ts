export function createRequestId() {
  return crypto.randomUUID();
}

export function logApiEvent(event: {
  requestId: string;
  route: string;
  userId?: string | null;
  level: "info" | "warn" | "error";
  message: string;
  extra?: Record<string, unknown>;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  const serialized = JSON.stringify(payload);
  if (event.level === "error") {
    console.error(serialized);
    return;
  }
  if (event.level === "warn") {
    console.warn(serialized);
    return;
  }
  console.info(serialized);
}
