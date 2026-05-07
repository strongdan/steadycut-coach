import { defineConfig } from "vitest/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(apiDir, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@steadycut/shared": resolve(repoRoot, "packages/shared/src/index.ts"),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
