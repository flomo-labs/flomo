import { defineConfig, devices } from "@playwright/test";
import { assertLocalEnv } from "./e2e/support/local-only";

// E2E do fluxo do spike (e2e/README.md). Precisa do Supabase local no ar
// (`supabase start`, migrations aplicadas) e do build do app feito com as
// variáveis do E2E; o Playwright sobe o TMDB falso e o `next start`.
const TMDB_FAKE_PORT = 3999;

assertLocalEnv(["NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL"]);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Só para ambientes com um Chromium já instalado em outro lugar.
        launchOptions: process.env.E2E_CHROMIUM_PATH
          ? { executablePath: process.env.E2E_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/tmdb-fake/server.mjs",
      url: `http://localhost:${TMDB_FAKE_PORT}/3/trending/all/week`,
      env: { TMDB_FAKE_PORT: String(TMDB_FAKE_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm start",
      url: "http://localhost:3000/em-breve",
      env: { TMDB_BASE_URL: `http://localhost:${TMDB_FAKE_PORT}/3` },
      // Nunca reaproveita: um `pnpm dev` na porta 3000 usaria o flomo-dev.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
