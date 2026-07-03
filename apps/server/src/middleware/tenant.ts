import { createMiddleware } from "hono/factory";
import { logRuntimeEvent } from "../lib/logging";
import { getDefaultTenant, getTenantConfig, type TenantConfig } from "../lib/tenant";

declare module "hono" {
  interface ContextVariableMap {
    tenant: TenantConfig;
    tenantId: string;
  }
}

export const tenantMiddleware = createMiddleware(async (c, next) => {
  const requestedTenantId = c.req.header("X-Talkly-Tenant");

  let tenantId = requestedTenantId;
  let tenant = tenantId ? getTenantConfig(tenantId) : null;

  if (tenantId && !tenant) {
    return c.json({ error: `Unknown tenant: ${tenantId}` }, 404);
  }

  if (!tenantId || !tenant) {
    const defaultTenant = getDefaultTenant();
    if (!defaultTenant) {
      return c.json({ error: "No tenant configured" }, 500);
    }

    [tenantId, tenant] = defaultTenant;
  }

  if (tenant.allowedOrigins?.length) {
    const origin = c.req.header("Origin") || c.req.header("Referer");
    if (!origin || !isAllowedOrigin(origin, tenant.allowedOrigins)) {
      logRuntimeEvent("warn", "origin_rejected", {
        tenantId,
        origin: origin || "none",
        ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
        path: c.req.path,
      });
      return c.json({ error: "Origin not allowed for this tenant" }, 403);
    }
  }

  c.set("tenant", tenant);
  c.set("tenantId", tenantId);

  await next();
});

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  return allowedOrigins.some((allowed) => {
    if (allowed.startsWith("*.")) {
      const suffix = allowed.slice(1); // ".example.com"
      return hostname === allowed.slice(2) || hostname.endsWith(suffix);
    }
    return hostname === allowed;
  });
}
