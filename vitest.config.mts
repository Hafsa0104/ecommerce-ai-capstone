import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal Vitest config for TradeHub's unit tests. Default environment
// is "node" for pure TypeScript logic (services/, lib/) that has no
// DOM dependency; the one component test (QuantityStepper.test.tsx)
// opts into jsdom per-file via a `// @vitest-environment jsdom`
// directive instead of switching this default, so the existing
// services/lib tests keep running exactly as before. See README.md's
// "Testing" section for what this does and does not cover.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["services/**/*.ts", "lib/**/*.ts", "components/**/*.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});
