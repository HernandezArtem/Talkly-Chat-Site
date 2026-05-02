/**
 * Seeds the default tenant's vector store with bundled demo content so a fresh
 * fork is fully working without an external website. Idempotent: re-running
 * appends, so use --reset to clear first.
 */
import { existsSync, readFileSync } from "node:fs";
import { ingestDocuments } from "../lib/rag/ingest";
import { clearDocuments, getDocumentCount } from "../lib/rag/vectorstore";
import { resolveServerPath } from "../lib/paths";
import { getDefaultTenant } from "../lib/tenant";

// Load .env then .env.local (later overrides) without Node's noisy
// "not found" messages from --env-file-if-exists. Both are optional.
for (const file of [".env", ".env.local"]) {
  const path = resolveServerPath(file);
  if (existsSync(path)) process.loadEnvFile(path);
}

interface SeedPage {
  url: string;
  title: string;
  content: string;
}

interface SeedFile {
  pages: SeedPage[];
  sampleQuestions: string[];
}

async function main() {
  const reset = process.argv.includes("--reset");
  const seedPath = resolveServerPath("data", "seed", "demo.json");
  const seed: SeedFile = JSON.parse(readFileSync(seedPath, "utf-8"));

  const defaultTenant = getDefaultTenant();
  if (!defaultTenant) {
    console.error("No default tenant configured in the instance config. Run `pnpm onboard` first.");
    process.exit(1);
  }
  const [tenantId, tenant] = defaultTenant;
  const dbPath = tenant.dbPath;

  console.log(`Seeding demo content into tenant "${tenantId}" (${dbPath})`);

  const existingCount = getDocumentCount(dbPath);
  if (existingCount > 0 && !reset) {
    console.log(`Skipping: ${existingCount} document chunk(s) already exist. Pass --reset to wipe and re-seed.`);
    printNextSteps(seed.sampleQuestions);
    return;
  }

  if (reset && existingCount > 0) {
    console.log(`Clearing ${existingCount} existing chunk(s)...`);
    clearDocuments(dbPath);
  }

  const documents = seed.pages.map((page) => ({
    content: `# ${page.title}\n\nSource: ${page.url}\n\n${page.content}`,
    metadata: { source: page.url, title: page.title },
  }));

  const result = await ingestDocuments(documents, dbPath);
  console.log(`Seeded ${result.chunksIngested} chunk(s) from ${seed.pages.length} page(s).`);
  printNextSteps(seed.sampleQuestions);
}

function printNextSteps(questions: string[]) {
  console.log("\nNext steps:");
  console.log("  1. pnpm build && pnpm start");
  console.log("  2. open http://localhost:3000/demo.html");
  if (questions.length > 0) {
    console.log("\nTry asking the bot:");
    for (const q of questions) console.log(`  - ${q}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
