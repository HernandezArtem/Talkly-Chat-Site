import * as cheerio from "cheerio";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { ingestDocuments } from "../lib/rag/ingest";
import { clearDocuments, getDocumentCount } from "../lib/rag/vectorstore";
import { resolveServerPath } from "../lib/paths";
import { getAllTenants, type TenantConfig } from "../lib/tenant";

const CONCURRENCY = 10;
const DELAY_MS = 100;
const SITEMAP_CANDIDATES = [
  "/sitemap.xml",
  "/sitemap_index.xml",
  "/sitemap-index.xml",
  "/sitemapindex.xml",
];
const HTML_SITEMAP_CANDIDATES = [
  "/sitemap",
];

interface ScrapedPage {
  url: string;
  title: string;
  content: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch a page and return its HTML, or null on failure.
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "TalklyBot/1.0 (website content ingestion for customer support)",
        Accept: "text/html,application/xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`  [skip] ${url} — HTTP ${res.status}`);
      return null;
    }

    return await res.text();
  } catch (err) {
    console.warn(`  [skip] ${url} — ${(err as Error).message}`);
    return null;
  }
}

function normalizeUrl(
  url: string,
  baseUrl: string,
  opts?: { allowXml?: boolean }
): string | null {
  try {
    const resolved = new URL(url, baseUrl);
    const base = new URL(baseUrl);

    if (resolved.origin !== base.origin) return null;
    if (!/^https?:$/.test(resolved.protocol)) return null;

    resolved.hash = "";

    const pathname = resolved.pathname.toLowerCase();
    if (
      /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|doc|docx|xls|xlsx|ppt|pptx|xml|json|css|js)$/i.test(pathname)
      && !opts?.allowXml
    ) {
      return null;
    }

    return resolved.toString().replace(/\/$/, (match) => {
      const root = `${resolved.origin}/`;
      return resolved.toString() === root ? match : "";
    });
  } catch {
    return null;
  }
}

function extractLocs(xml: string, tagName: "url" | "sitemap"): string[] {
  const regex = new RegExp(
    `<(?:[\\w-]+:)?${tagName}>[\\s\\S]*?<loc>([\\s\\S]*?)<\\/loc>[\\s\\S]*?<\\/(?:[\\w-]+:)?${tagName}>`,
    "gi"
  );
  const results: string[] = [];
  for (const match of xml.matchAll(regex)) {
    const value = match[1]?.trim();
    if (value) results.push(value);
  }
  return results;
}

function parseRobotsForSitemaps(robotsTxt: string): string[] {
  return robotsTxt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line))
    .map((line) => line.replace(/^sitemap:\s*/i, "").trim())
    .filter(Boolean);
}

async function fetchSitemapEntries(sitemapUrl: string): Promise<string[]> {
  const xml = await fetchPage(sitemapUrl);
  if (!xml) return [];

  const sitemapRefs = extractLocs(xml, "sitemap");
  if (sitemapRefs.length > 0) {
    const nested = await Promise.all(sitemapRefs.map((ref) => fetchSitemapEntries(ref)));
    return nested.flat();
  }

  const pageUrls = extractLocs(xml, "url");
  if (pageUrls.length > 0) {
    return pageUrls;
  }

  const $ = cheerio.load(xml, { xml: true });
  const fallbackUrls: string[] = [];
  $("url > loc, loc").each((_, el) => {
    const value = $(el).text().trim();
    if (value) fallbackUrls.push(value);
  });
  return fallbackUrls;
}

async function fetchHtmlSitemapEntries(sitemapUrl: string, baseUrl: string): Promise<string[]> {
  const html = await fetchPage(sitemapUrl);
  if (!html) return [];

  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const normalized = normalizeUrl(href, baseUrl);
    if (!normalized) return;
    if (normalized === sitemapUrl || normalized === baseUrl) return;

    urls.add(normalized);
  });

  return [...urls];
}

/**
 * Fetch the sitemap.xml and extract all page URLs.
 */
async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const robotsUrl = `${baseUrl}/robots.txt`;
  const sitemapRefs = new Set<string>();

  console.log(`Fetching robots from ${robotsUrl}...`);
  const robotsTxt = await fetchPage(robotsUrl);
  if (robotsTxt) {
    for (const ref of parseRobotsForSitemaps(robotsTxt)) {
      const normalized = normalizeUrl(ref, baseUrl, { allowXml: true });
      if (normalized) sitemapRefs.add(normalized);
    }
  }

  for (const path of SITEMAP_CANDIDATES) {
    sitemapRefs.add(new URL(path, baseUrl).toString());
  }

  for (const sitemapUrl of sitemapRefs) {
    console.log(`Fetching sitemap from ${sitemapUrl}...`);
    const urls = await fetchSitemapEntries(sitemapUrl);
    const normalizedUrls = urls
      .map((url) => normalizeUrl(url, baseUrl))
      .filter((url): url is string => Boolean(url));

    if (normalizedUrls.length > 0) {
      return [...new Set(normalizedUrls)];
    }
  }

  for (const path of HTML_SITEMAP_CANDIDATES) {
    const sitemapUrl = new URL(path, baseUrl).toString();
    console.log(`Fetching HTML sitemap from ${sitemapUrl}...`);
    const urls = await fetchHtmlSitemapEntries(sitemapUrl, baseUrl);

    if (urls.length > 0) {
      return urls;
    }
  }

  console.warn("Could not fetch usable sitemap URLs or HTML sitemap links.");
  return [baseUrl];
}

/**
 * Extract readable text content from HTML.
 */
function extractContent(
  html: string,
  pageUrl: string
): { title: string; content: string } {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, nav, footer, header, iframe, noscript, svg, [role='navigation'], .cookie-bar, .cookie-banner, #cookie-consent"
  ).remove();

  const title = $("title").text().trim() || $("h1").first().text().trim() || pageUrl;

  // Extract main content (prefer <main> or <article>, fall back to body)
  let contentRoot = $("main, article, [role='main']").first();
  if (contentRoot.length === 0) {
    contentRoot = $("body");
  }

  // Build structured text from headings and paragraphs
  const parts: string[] = [];

  contentRoot.find("h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, dd, dt").each((_, el) => {
    const tag = (el as any).tagName?.toLowerCase();
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!text) return;

    if (tag?.startsWith("h")) {
      parts.push(`\n${"#".repeat(Number(tag[1]))} ${text}\n`);
    } else if (tag === "li") {
      parts.push(`- ${text}`);
    } else {
      parts.push(text);
    }
  });

  const content = parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, content };
}

/**
 * Scrape all URLs, fetching pages in batches.
 */
async function scrapeUrls(urls: string[]): Promise<ScrapedPage[]> {
  const pages: ScrapedPage[] = [];
  let processed = 0;

  console.log(`\nScraping ${urls.length} pages (concurrency: ${CONCURRENCY})...\n`);

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(async (url) => {
        processed++;
        console.log(`[${processed}/${urls.length}] ${url}`);
        const html = await fetchPage(url);
        if (!html) return null;

        const { title, content } = extractContent(html, url);

        if (content.length < 50) {
          console.log(`  [skip] Too little content (${content.length} chars)`);
          return null;
        }

        return { url, title, content };
      })
    );

    for (const result of results) {
      if (result) pages.push(result);
    }

    if (i + CONCURRENCY < urls.length) {
      await sleep(DELAY_MS);
    }
  }

  return pages;
}

/**
 * Scrape and ingest for a single tenant.
 */
async function scrapeTenant(
  tenantId: string,
  tenant: TenantConfig,
  opts: { dryRun: boolean; saveJson: boolean }
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Tenant: ${tenantId} (${tenant.name})`);
  console.log(`URL:    ${tenant.scrapeUrl}`);
  console.log(`DB:     ${tenant.dbPath}`);
  console.log(`${"=".repeat(60)}\n`);

  const urls = await fetchSitemapUrls(tenant.scrapeUrl);
  console.log(`Found ${urls.length} URLs in sitemap.`);

  const pages = await scrapeUrls(urls);

  console.log(`\nScrape complete. ${pages.length} pages with content.\n`);

  if (pages.length === 0) {
    console.error(`No pages scraped for tenant ${tenantId}. Check the URL and your network connection.`);
    return;
  }

  // Optionally save raw scraped data
  if (opts.saveJson || opts.dryRun) {
    const outDir = resolveServerPath("data");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, `${tenantId}-scraped-pages.json`);
    writeFileSync(outPath, JSON.stringify(pages, null, 2));
    console.log(`Saved scraped data to ${outPath}`);
  }

  if (opts.dryRun) {
    console.log("\n--dry-run: Skipping ingestion into vector store.");
    for (const page of pages) {
      console.log(`  - ${page.title} (${page.content.length} chars) — ${page.url}`);
    }
    return;
  }

  // Clear existing documents and re-ingest
  console.log(`Clearing existing documents for tenant ${tenantId}...`);
  clearDocuments(tenant.dbPath);

  console.log("Ingesting into vector store...\n");

  const documents = pages.map((page) => ({
    content: `# ${page.title}\n\nSource: ${page.url}\n\n${page.content}`,
    metadata: {
      source: page.url,
      title: page.title,
    },
  }));

  const result = await ingestDocuments(documents, tenant.dbPath);
  const storedChunks = getDocumentCount(tenant.dbPath);

  if (storedChunks < pages.length) {
    throw new Error(
      `[Talkly] Ingestion incomplete for ${tenantId}: stored ${storedChunks} chunks for ${pages.length} scraped pages`
    );
  }

  console.log(`Done! Ingested ${result.chunksIngested} chunks from ${pages.length} pages for tenant ${tenantId}.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const saveJson = args.includes("--save-json");
  const allTenants = args.includes("--all");

  const tenantArgIdx = args.indexOf("--tenant");
  const tenantId = tenantArgIdx !== -1 ? args[tenantArgIdx + 1] : undefined;

  if (!allTenants && !tenantId) {
    console.error("Usage: scrape-ingest --tenant <id> | --all [--dry-run] [--save-json]");
    console.error("\nAvailable tenants:");
    for (const [id, config] of getAllTenants()) {
      console.error(`  ${id} — ${config.name} (${config.scrapeUrl})`);
    }
    process.exit(1);
  }

  const tenantsToScrape = allTenants
    ? getAllTenants()
    : getAllTenants().filter(([id]) => id === tenantId);

  if (tenantsToScrape.length === 0) {
    console.error(`Unknown tenant: ${tenantId}`);
    console.error("\nAvailable tenants:");
    for (const [id, config] of getAllTenants()) {
      console.error(`  ${id} — ${config.name} (${config.scrapeUrl})`);
    }
    process.exit(1);
  }

  for (const [id, config] of tenantsToScrape) {
    await scrapeTenant(id, config, { dryRun, saveJson });
  }

  console.log("\n\nAll tenants scraped successfully.");
}

export { scrapeTenant, fetchSitemapUrls, scrapeUrls };

main().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
