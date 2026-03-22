import { describe, expect, it } from "vitest";
import { MASTER_ROLE_NAME } from "@/lib/auth/constants";
import { hasProjectAccess } from "@/lib/projects/access-rules";

describe("hasProjectAccess", () => {
  it("allows MASTER role for write and read", () => {
    expect(hasProjectAccess("read", [MASTER_ROLE_NAME], [])).toBe(true);
    expect(hasProjectAccess("write", [MASTER_ROLE_NAME], [])).toBe(true);
  });

  it("allows read with projects:read permission", () => {
    const result = hasProjectAccess("read", [], [{ resource: "projects", action: "read" }]);
    expect(result).toBe(true);
  });

  it("allows read with projects:write permission", () => {
    const result = hasProjectAccess("read", [], [{ resource: "projects", action: "write" }]);
    expect(result).toBe(true);
  });

  it("requires write permission for write action", () => {
    expect(
      hasProjectAccess("write", [], [{ resource: "projects", action: "read" }]),
    ).toBe(false);
    expect(
      hasProjectAccess("write", [], [{ resource: "projects", action: "write" }]),
    ).toBe(true);
  });
});
