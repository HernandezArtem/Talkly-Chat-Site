import { Hono } from "hono";
import { getDocumentCount } from "../lib/rag/vectorstore";
import { loadGuardrailsConfig } from "../lib/guardrails";
import { getDefaultTenant, getTenantConfig } from "../lib/tenant";

export const healthRoute = new Hono();

healthRoute.get("/", (c) => {
  const providers: string[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.ANTHROPIC_API_KEY) providers.push("anthropic");
  if (process.env.AZURE_OPENAI_API_KEY) providers.push("azure-openai");

  // Tenant is optional for health checks (load balancer probes won't send it)
  const requestedTenantId = c.req.header("X-Chattr-Tenant");
  const defaultTenant = getDefaultTenant();
  const tenantId = requestedTenantId || defaultTenant?.[0] || null;
  const tenant = tenantId ? getTenantConfig(tenantId) : null;

  let docCount = 0;
  try {
    docCount = getDocumentCount(tenant?.dbPath);
  } catch {
    // DB not initialized yet
  }

  const config = loadGuardrailsConfig(tenant?.guardrails);

  return c.json({
    status: "ok",
    tenant: tenantId || null,
    providers,
    ragEnabled: docCount > 0,
    documentCount: docCount,
    guardrails: {
      enabled: true,
      identity: config.identity.role,
      allowedTopics: config.rules.allowedTopics ?? [],
      forbiddenTopics: config.rules.forbiddenTopics ?? [],
      redirectCount: Object.keys(config.rules.redirects ?? {}).length,
      inputChecks: {
        promptInjectionDetection: config.inputGuardrails.promptInjectionDetection ?? true,
        rateLimitPerMinute: config.inputGuardrails.rateLimitCount ?? 20,
        maxMessageLength: config.inputGuardrails.maxMessageLength ?? 4000,
      },
      outputChecks: {
        systemPromptLeakDetection: config.outputGuardrails.systemPromptLeakDetection ?? true,
        contentFiltering: config.outputGuardrails.contentFiltering ?? true,
        maxResponseTokens: config.outputGuardrails.maxResponseTokens ?? 2048,
      },
    },
  });
});
