import { tenantBootstrapSchema } from "@chattr/shared";
import { Hono } from "hono";
import { buildTenantBootstrap } from "../lib/tenant";

export const bootstrapRoute = new Hono();

bootstrapRoute.get("/", async (c) => {
  const tenantId = c.get("tenantId");
  const tenant = c.get("tenant");
  const payload = buildTenantBootstrap(tenantId, tenant);
  const parsed = tenantBootstrapSchema.parse(payload);
  return c.json(parsed);
});
