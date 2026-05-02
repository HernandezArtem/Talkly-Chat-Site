import { describe, expect, it } from "vitest";
import { getDefaultTenant, getTenantConfig } from "../tenant";

describe("tenant registry", () => {
  it("resolves the default tenant from the bundled instance config", () => {
    const entry = getDefaultTenant();
    expect(entry).not.toBeNull();

    const [tenantId, tenant] = entry!;
    expect(tenantId).toBe("default");
    expect(tenant.name).toBeTruthy();
    expect(tenant.dbPath).toMatch(/\.db$/);
  });

  it("returns null for an unknown tenant id", () => {
    expect(getTenantConfig("does-not-exist")).toBeNull();
  });
});
