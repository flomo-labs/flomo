import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next usa `jsx: preserve`; nos testes o esbuild compila o JSX.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Testes contra o banco rodam com `pnpm test:integration`.
    // Testes de componente pedem `// @vitest-environment jsdom` no topo do arquivo.
    exclude: ["src/**/*.integration.test.ts"],
  },
});
