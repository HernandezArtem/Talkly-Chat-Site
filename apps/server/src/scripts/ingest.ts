import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, extname } from "path";
import { ingestDocuments } from "../lib/rag/ingest";
import { getDefaultTenant, getTenantConfig } from "../lib/tenant";

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const { args, tenantId } = parseArgs(rawArgs);

  if (args.length === 0) {
    console.error("Usage: pnpm ingest [--tenant <id>] <path-to-file-or-directory>");
    console.error("Supported formats: .txt, .md, .json (scraper output)");
    process.exit(1);
  }

  const resolvedTenant = tenantId ? getTenantConfig(tenantId) : getDefaultTenant()?.[1];
  const resolvedTenantId = tenantId || getDefaultTenant()?.[0];
  if (!resolvedTenant || !resolvedTenantId) {
    console.error(`Unknown tenant: ${tenantId}`);
    process.exit(1);
  }

  const targetPath = resolve(args[0]);
  const files: string[] = [];

  const stat = statSync(targetPath);
  if (stat.isDirectory()) {
    collectFiles(targetPath, files);
  } else {
    files.push(targetPath);
  }

  if (files.length === 0) {
    console.error("No supported files found.");
    process.exit(1);
  }

  console.log(`Found ${files.length} file(s) to ingest...`);
  console.log(`Target tenant: ${resolvedTenantId} (${resolvedTenant.dbPath})`);

  const documents = files.flatMap((filePath) => {
    const ext = extname(filePath).toLowerCase();

    if (ext === ".json") {
      // Handle scraped pages JSON format
      const raw = readFileSync(filePath, "utf-8");
      const pages: ScrapedPage[] = JSON.parse(raw);
      console.log(`  ${filePath}: ${pages.length} pages from scraper output`);
      return pages.map((page) => ({
        content: `# ${page.title}\n\nSource: ${page.url}\n\n${page.content}`,
        metadata: { source: page.url, title: page.title },
      }));
    }

    return [{
      content: readFileSync(filePath, "utf-8"),
      metadata: { source: filePath },
    }];
  });

  const result = await ingestDocuments(documents, resolvedTenant.dbPath);
  console.log(`Done! Ingested ${result.chunksIngested} chunks from ${files.length} file(s).`);
}

function collectFiles(dir: string, out: string[]) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = resolve(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, out);
    } else {
      const ext = extname(full).toLowerCase();
      if ([".txt", ".md", ".json"].includes(ext)) {
        out.push(full);
      }
    }
  }
}

function parseArgs(rawArgs: string[]): { args: string[]; tenantId?: string } {
  const args: string[] = [];
  let tenantId: string | undefined;

  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--tenant") {
      tenantId = rawArgs[i + 1];
      i++;
      continue;
    }

    args.push(rawArgs[i]);
  }

  return { args, tenantId };
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
