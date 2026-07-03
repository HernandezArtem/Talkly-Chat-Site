import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const src = join(scriptDir, "../../../packages/widget/dist/index.global.js");
const dest = join(scriptDir, "../public/widget.js");

if (!existsSync(src)) {
  console.warn("[talkly] Widget bundle not found. Run: pnpm --filter @talkly/widget build");
  process.exit(0);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[talkly] Copied widget.js to apps/server/public/");
