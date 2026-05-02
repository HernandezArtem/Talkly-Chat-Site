import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { bootstrapRoute } from "./routes/bootstrap";
import { chatRoute } from "./routes/chat";
import { feedbackRoute } from "./routes/feedback";
import { healthRoute } from "./routes/health";
import { ingestRoute } from "./routes/ingest";
import { logRuntimeEvent } from "./lib/logging";
import { resolveServerPath } from "./lib/paths";
import { tenantMiddleware } from "./middleware/tenant";
import { getAllAllowedOrigins, loadTenantRegistry } from "./lib/tenant";

// Pre-load tenant registry at startup
loadTenantRegistry();

const app = new Hono();

const allAllowedOrigins = getAllAllowedOrigins();

app.use("/api/*", cors({
  origin: allAllowedOrigins.length > 0
    ? (origin) => {
        if (!origin) return origin;
        try {
          const hostname = new URL(origin).hostname;
          const allowed = allAllowedOrigins.some((pattern) => {
            if (pattern.startsWith("*.")) {
              const suffix = pattern.slice(1);
              return hostname === pattern.slice(2) || hostname.endsWith(suffix);
            }
            return hostname === pattern;
          });
          return allowed ? origin : null;
        } catch {
          return null;
        }
      }
    : "*",
}));

app.onError((err, c) => {
  logRuntimeEvent("error", "http_request_failed", {
    requestId: c.req.header("x-request-id"),
    method: c.req.method,
    path: c.req.path,
    tenantId: c.get("tenantId"),
    error: err.message,
    stack: err.stack,
  });

  return c.json({ error: "Internal server error" }, 500);
});

// Health route does NOT require tenant (for load balancer probes)
app.route("/api/health", healthRoute);

// Chat and ingest routes require tenant
app.use("/api/chat/*", tenantMiddleware);
app.use("/api/bootstrap/*", tenantMiddleware);
app.use("/api/feedback/*", tenantMiddleware);
app.use("/api/ingest/*", tenantMiddleware);
app.route("/api/bootstrap", bootstrapRoute);
app.route("/api/chat", chatRoute);
app.route("/api/feedback", feedbackRoute);
app.route("/api/ingest", ingestRoute);

app.use("/*", serveStatic({ root: resolveServerPath("public") }));

const port = Number(process.env.PORT) || 3000;

logRuntimeEvent("info", "server_started", {
  port,
});

serve({ fetch: app.fetch, port });
