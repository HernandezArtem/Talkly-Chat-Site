import { defineConfig } from "tsup";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const publicWidget = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/server/public/widget.js"
);

function copyWidgetToPublic() {
  const src = join(dirname(fileURLToPath(import.meta.url)), "dist/index.global.js");
  if (!existsSync(src)) return;
  mkdirSync(dirname(publicWidget), { recursive: true });
  copyFileSync(src, publicWidget);
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["iife"],
  minify: true,
  target: "es2020",
  outDir: "dist",
  clean: true,
  noExternal: [/.*/],
  platform: "browser",
  onSuccess: copyWidgetToPublic,
});
