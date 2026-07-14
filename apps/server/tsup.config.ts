import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/scripts/seed-demo.ts"],
  format: ["cjs"],
  target: "node20",
  outDir: "dist",
  clean: true,
  // Bundle workspace TS packages — Node can't resolve extensionless imports from src/
  noExternal: ["@talkly/shared"],
  // Don't bundle native modules
  external: ["better-sqlite3", "sqlite-vec"],
});
