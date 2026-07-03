import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@talkly/shared": resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
  test: {
    include: ["apps/**/src/**/*.test.ts", "packages/**/src/**/*.test.ts"],
    environment: "node",
  },
});
