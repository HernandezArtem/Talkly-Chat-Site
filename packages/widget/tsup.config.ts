import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["iife"],
  globalName: "Chattr",
  minify: true,
  target: "es2020",
  outDir: "dist",
  clean: true,
  noExternal: [/.*/],
  platform: "browser",
});
