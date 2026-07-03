import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { detectChatIntent } from "../lib/intents";
import { getEnv } from "../lib/env";
import { resolveFromServerRoot } from "../lib/paths";
import { getEmbeddingModel } from "../lib/providers";
import { getTenantConfig } from "../lib/tenant";
import { retrieveContext } from "../lib/rag/retrieve";

const retrievalCheckSchema = z.object({
  tenantId: z.string(),
  query: z.string().min(1),
  expectedSourceIncludes: z.array(z.string().min(1)).min(1),
  minConfidence: z.enum(["low", "medium", "high"]).optional(),
});

const retrievalChecksFileSchema = z.array(retrievalCheckSchema);

type RetrievalCheck = z.infer<typeof retrievalCheckSchema>;

const CONFIDENCE_SCORE: Record<"low" | "medium" | "high", number> = {
  low: 0,
  medium: 1,
  high: 2,
};

async function main() {
  assertEmbeddingConfig();

  const args = process.argv.slice(2);
  const tenantArg = getArg(args, "--tenant");
  const queryArg = getArg(args, "--query");
  const expectArg = getArg(args, "--expect");
  const minConfidenceArg = getArg(args, "--min-confidence") as RetrievalCheck["minConfidence"] | undefined;
  const fileArg = getArg(args, "--file") || "./retrieval-checks.json";

  const checks = tenantArg && queryArg && expectArg
    ? [{
        tenantId: tenantArg,
        query: queryArg,
        expectedSourceIncludes: [expectArg],
        minConfidence: minConfidenceArg,
      }]
    : loadChecks(fileArg).filter((check) => !tenantArg || check.tenantId === tenantArg);

  if (checks.length === 0) {
    console.error("No retrieval checks selected.");
    process.exit(1);
  }

  let failed = false;

  for (const check of checks) {
    const tenant = getTenantConfig(check.tenantId);
    if (!tenant) {
      console.error(`[FAIL] Unknown tenant: ${check.tenantId}`);
      failed = true;
      continue;
    }

    const intent = detectChatIntent(check.tenantId, check.query);
    const result = await retrieveContext(check.query, 5, tenant.dbPath, { intent });
    const urls = result.sources.map((source) => source.url);
    const matched = urls.find((url) =>
      check.expectedSourceIncludes.some((fragment) => url.includes(fragment))
    );

    const confidenceOk = !check.minConfidence
      || CONFIDENCE_SCORE[result.confidence] >= CONFIDENCE_SCORE[check.minConfidence];

    if (!matched || !confidenceOk) {
      failed = true;
      console.error(`[FAIL] ${check.tenantId}: "${check.query}"`);
      if (!matched) {
        console.error(`       expected source containing one of: ${check.expectedSourceIncludes.join(", ")}`);
      }
      if (!confidenceOk) {
        console.error(`       expected confidence >= ${check.minConfidence}, got ${result.confidence}`);
      }
      console.error(`       got: ${urls.join(", ") || "(no sources)"}`);
      continue;
    }

    console.log(
      `[PASS] ${check.tenantId}: "${check.query}" -> ${matched} (${result.confidence}${intent ? `, intent=${intent.id}` : ""})`
    );
  }

  if (failed) {
    process.exit(1);
  }
}

function loadChecks(filePath: string): RetrievalCheck[] {
  const resolved = resolveFromServerRoot(filePath);
  const raw = readFileSync(resolved, "utf8");
  return retrievalChecksFileSchema.parse(JSON.parse(raw));
}

function getArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

function assertEmbeddingConfig() {
  const provider = getEnv("TALKLY_PROVIDER") || "openai";

  if (provider === "azure-openai" && !process.env.AZURE_OPENAI_API_KEY) {
    throw new Error(
      "Missing AZURE_OPENAI_API_KEY. Set it in the environment, or run `npm run check-retrieval:local` from apps/server."
    );
  }

  if (provider !== "azure-openai" && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "Missing OPENAI_API_KEY. Set it in the environment, or run `npm run check-retrieval:local` from apps/server."
    );
  }

  getEmbeddingModel();
}

main().catch((error) => {
  console.error("Retrieval check failed:", error);
  process.exit(1);
});
