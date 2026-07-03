/**
 * Interactive first-run setup. Walks the operator through choosing a provider,
 * setting an API key, and personalizing the default tenant. Writes .env and
 * rewrites the canonical instance config. Safe to re-run — existing values are
 * offered as defaults.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import defaultInstanceConfig from "../instance/default/talkly.config";
import {
  instanceConfigSchema,
  type TalklyInstanceConfig,
  type InstanceTenantConfig,
} from "../instance/config";
import { resolveServerPath } from "../lib/paths";

interface ProviderChoice {
  id: string;
  label: string;
  envKey: string | null;
  defaultModel: string;
  hint?: string;
}

const PROVIDERS: ProviderChoice[] = [
  { id: "openai", label: "OpenAI", envKey: "OPENAI_API_KEY", defaultModel: "gpt-4o" },
  { id: "anthropic", label: "Anthropic", envKey: "ANTHROPIC_API_KEY", defaultModel: "claude-3-5-sonnet-latest", hint: "Embeddings still need OPENAI_API_KEY." },
  { id: "azure-openai", label: "Azure OpenAI", envKey: "AZURE_OPENAI_API_KEY", defaultModel: "gpt-4o", hint: "You'll also be asked for resource name and deployment names." },
  { id: "ollama", label: "Ollama (or any OpenAI-compatible local server)", envKey: null, defaultModel: "llama3.2", hint: "No API key required. Defaults to http://localhost:11434/v1." },
];

const ENV_PATH = resolveServerPath(".env");
const INSTANCE_CONFIG_PATH = resolveServerPath("src", "instance", "default", "talkly.config.ts");

async function main() {
  const rl = createInterface({ input, output });
  const ask = (prompt: string, fallback?: string) =>
    rl.question(fallback ? `${prompt} [${fallback}]: ` : `${prompt}: `).then((v) => v.trim() || fallback || "");

  console.log("\nTalkly setup");
  console.log("------------");
  console.log("This walks through provider, branding, and your first scrape source.");
  console.log("Press Enter to accept the value in [brackets]. Re-run any time.\n");

  const existingEnv = readEnv(ENV_PATH);
  const existingInstance = instanceConfigSchema.parse(defaultInstanceConfig);
  const existingDefaultTenantId = getDefaultTenantId(existingInstance);
  const existingDefault = existingInstance.tenants[existingDefaultTenantId] ?? null;

  // ── Provider ──
  console.log("Which model provider?");
  PROVIDERS.forEach((p, i) => console.log(`  ${i + 1}. ${p.label}${p.hint ? ` — ${p.hint}` : ""}`));

  const currentProvider = existingEnv.TALKLY_PROVIDER || "openai";
  const currentIndex = PROVIDERS.findIndex((p) => p.id === currentProvider);
  const choiceRaw = await ask("Choose 1-4", String(currentIndex >= 0 ? currentIndex + 1 : 1));
  const choiceIdx = Math.max(1, Math.min(PROVIDERS.length, Number(choiceRaw))) - 1;
  const provider = PROVIDERS[choiceIdx];

  const env: Record<string, string> = { ...existingEnv };
  env.TALKLY_PROVIDER = provider.id;

  // ── API key ──
  if (provider.envKey) {
    const existing = env[provider.envKey];
    const shown = existing ? maskKey(existing) : "";
    const value = await ask(`${provider.envKey}`, shown || undefined);
    if (value && value !== shown) env[provider.envKey] = value;
    else if (existing && (!value || value === shown)) env[provider.envKey] = existing;
  }

  // ── Model ──
  const model = await ask("Chat model", env.TALKLY_MODEL || provider.defaultModel);
  env.TALKLY_MODEL = model;

  // ── Provider-specific extras ──
  if (provider.id === "azure-openai") {
    env.AZURE_OPENAI_RESOURCE_NAME = await ask("AZURE_OPENAI_RESOURCE_NAME", env.AZURE_OPENAI_RESOURCE_NAME);
    env.AZURE_OPENAI_CHAT_DEPLOYMENT = await ask("AZURE_OPENAI_CHAT_DEPLOYMENT", env.AZURE_OPENAI_CHAT_DEPLOYMENT || model);
    env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = await ask("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small");
  }

  if (provider.id === "ollama") {
    const baseUrl = await ask("OLLAMA_BASE_URL", env.OLLAMA_BASE_URL || "http://localhost:11434/v1");
    if (baseUrl) env.OLLAMA_BASE_URL = baseUrl;
    const embModel = await ask("OLLAMA_EMBEDDING_MODEL", env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text");
    if (embModel) env.OLLAMA_EMBEDDING_MODEL = embModel;
    const embDim = await ask("OLLAMA_EMBEDDING_DIMENSIONS (768 for nomic-embed-text, 1024 for mxbai-embed-large)", env.OLLAMA_EMBEDDING_DIMENSIONS || "768");
    if (embDim) env.OLLAMA_EMBEDDING_DIMENSIONS = embDim;
  }

  if (provider.id === "anthropic" && !env.OPENAI_API_KEY) {
    console.log("\nNote: Anthropic doesn't ship embeddings yet, so Talkly falls back to OpenAI for RAG embeddings.");
    const openaiKey = await ask("OPENAI_API_KEY (for embeddings)", "");
    if (openaiKey) env.OPENAI_API_KEY = openaiKey;
  }

  // ── Admin key ──
  const adminKey = await ask("TALKLY_ADMIN_KEY (bearer token for /api/ingest)", env.TALKLY_ADMIN_KEY || generateAdminKey());
  env.TALKLY_ADMIN_KEY = adminKey;

  // ── Tenant ──
  console.log("\nDefault tenant — what your visitors see in the widget:");
  const name = await ask("Site or product name", existingDefault?.name || "Acme");
  const primaryColor = await ask("Brand accent color (CSS hex)", existingDefault?.widget?.theme?.primaryColor || "#0f766e");
  const widgetTitle = await ask("Widget header title", existingDefault?.widget?.theme?.title || `${name} Assistant`);
  const widgetSubtitle = await ask("Widget header subtitle", existingDefault?.widget?.theme?.subtitle || "Ask anything about our site");
  const welcome = await ask("Welcome message", existingDefault?.widget?.welcomeMessage || `Hi! I'm the ${name} assistant. How can I help?`);
  const scrapeUrl = await ask("Site URL to scrape for content (must be a full URL)", existingDefault?.scrapeUrl || "https://example.com");
  const supportEmail = await ask("Support email (optional)", existingDefault?.escalation?.email || "");
  const supportUrl = await ask("Support / contact page URL (optional)", existingDefault?.escalation?.url || "");

  const escalation: Record<string, string> = {};
  if (supportEmail) escalation.email = supportEmail;
  if (supportUrl) escalation.url = supportUrl;

  const defaultTenant: InstanceTenantConfig = {
    name,
    dbPath: existingDefault?.dbPath || "./data/default.db",
    scrapeUrl,
    systemPrompt:
      existingDefault?.systemPrompt
      || `You are a helpful assistant for ${name}. Answer questions visitors have about the site, products, and support. If you don't know an answer from the knowledge base, say so clearly and offer the listed contact options.`,
    widget: {
      theme: {
        primaryColor,
        title: widgetTitle,
        subtitle: widgetSubtitle,
        avatarUrl: existingDefault?.widget?.theme?.avatarUrl || "/avatar.svg",
      },
      bubbleMessage: existingDefault?.widget?.bubbleMessage || "Ask a question",
      bubbleDelay: existingDefault?.widget?.bubbleDelay,
      welcomeMessage: welcome,
      starterQuestions: existingDefault?.widget?.starterQuestions ?? [
        "How do I contact support?",
        `What does ${name} do?`,
        "What products or services do you offer?",
      ],
    },
    ...(Object.keys(escalation).length > 0 ? { escalation } : {}),
    ...(existingDefault?.allowedOrigins ? { allowedOrigins: existingDefault.allowedOrigins } : {}),
    ...(existingDefault?.guardrails ? { guardrails: existingDefault.guardrails } : {}),
  };

  const nextInstanceConfig: TalklyInstanceConfig = {
    ...existingInstance,
    defaultTenantId: existingDefaultTenantId,
    tenants: {
      ...existingInstance.tenants,
      [existingDefaultTenantId]: defaultTenant,
    },
  };

  // ── Write everything ──
  writeEnv(ENV_PATH, env);
  writeFileSync(INSTANCE_CONFIG_PATH, renderInstanceConfig(nextInstanceConfig));

  console.log("\nWrote:");
  console.log(`  ${ENV_PATH}`);
  console.log(`  ${INSTANCE_CONFIG_PATH}`);

  // ── Initial content ──
  console.log("\nLoad some content so the bot has something to answer with?");
  console.log("  d) Demo content (5 generic FAQ pages — works instantly, no network needed)");
  console.log(`  s) Scrape ${scrapeUrl} now (requires the URL to be reachable)`);
  console.log("  n) Skip — I'll ingest content myself later");
  const contentChoice = (await ask("Choose d/s/n", "d")).toLowerCase();
  rl.close();

  const repoRoot = resolveServerPath("..", "..");

  if (contentChoice.startsWith("s")) {
    console.log("\nRunning scrape-ingest...");
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("pnpm", ["--filter", "@talkly/server", "run", "scrape-ingest", "--", "--tenant", "default"], {
      stdio: "inherit",
      cwd: repoRoot,
    });
    if (result.status !== 0) {
      console.error("\nScrape failed. You can retry with: pnpm --filter @talkly/server run scrape-ingest -- --tenant default");
      console.error("Or seed bundled demo content instead: pnpm seed-demo");
      process.exit(result.status ?? 1);
    }
  } else if (contentChoice.startsWith("n")) {
    console.log("\nSkipping content ingest. Run `pnpm seed-demo` later for bundled demo content, or `pnpm --filter @talkly/server run scrape-ingest -- --tenant default` to scrape your site.");
  } else {
    console.log("\nSeeding demo content...");
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("pnpm", ["--filter", "@talkly/server", "run", "seed-demo"], {
      stdio: "inherit",
      cwd: repoRoot,
    });
    if (result.status !== 0) {
      console.error("\nSeed failed. You can retry with: pnpm seed-demo");
      process.exit(result.status ?? 1);
    }
  }

  console.log("\nDone. Next steps:");
  console.log("  pnpm build && pnpm start");
  console.log("  open http://localhost:3000/demo.html");
  console.log("\nEmbed snippet:");
  console.log("  <script src=\"http://localhost:3000/widget.js\" data-server=\"http://localhost:3000\" defer></script>\n");
}

function readEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  const raw = readFileSync(path, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function writeEnv(path: string, env: Record<string, string>): void {
  const lines = Object.entries(env)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `${k}=${needsQuoting(v) ? JSON.stringify(v) : v}`);
  writeFileSync(path, lines.join("\n") + "\n");
}

function needsQuoting(value: string): boolean {
  return /[\s"'#]/.test(value);
}

function maskKey(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function getDefaultTenantId(config: TalklyInstanceConfig): string {
  if (config.defaultTenantId && config.tenants[config.defaultTenantId]) {
    return config.defaultTenantId;
  }

  if (config.tenants.default) {
    return "default";
  }

  const firstTenantId = Object.keys(config.tenants)[0];
  if (!firstTenantId) {
    throw new Error("At least one tenant must exist in the instance config.");
  }

  return firstTenantId;
}

function renderInstanceConfig(config: TalklyInstanceConfig): string {
  return [
    "import { defineInstanceConfig } from \"../config\";",
    "",
    "export default defineInstanceConfig(",
    `${JSON.stringify(config, null, 2)}`,
    ");",
    "",
  ].join("\n");
}

function generateAdminKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

main().catch((err) => {
  console.error("\nSetup failed:", err);
  process.exit(1);
});
