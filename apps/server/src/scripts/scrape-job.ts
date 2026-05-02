/**
 * Cron job entrypoint for Azure Container Apps Job.
 * Scrapes all tenants and re-ingests into their vector stores.
 */
import { getAllTenants, loadTenantRegistry } from "../lib/tenant";
import { scrapeTenant } from "./scrape-ingest";

function log(level: "info" | "error", message: string, extra?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...extra,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

async function main() {
  log("info", "Scrape job started");

  loadTenantRegistry();
  const tenants = getAllTenants();

  log("info", `Found ${tenants.length} tenants to scrape`, {
    tenants: tenants.map(([id]) => id),
  });

  let failures = 0;

  for (const [id, config] of tenants) {
    log("info", `Starting scrape for tenant: ${id}`, { tenant: id });
    try {
      await scrapeTenant(id, config, { dryRun: false, saveJson: false });
      log("info", `Scrape complete for tenant: ${id}`, { tenant: id });
    } catch (err) {
      failures++;
      log("error", `Scrape failed for tenant: ${id}`, {
        tenant: id,
        error: (err as Error).message,
      });
    }
  }

  if (failures > 0) {
    log("error", `Scrape job finished with ${failures} failure(s)`);
    process.exit(1);
  }

  log("info", "Scrape job completed successfully");
}

main().catch((err) => {
  log("error", "Scrape job crashed", { error: (err as Error).message });
  process.exit(1);
});
