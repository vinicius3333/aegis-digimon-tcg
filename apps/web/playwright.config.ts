import { defineConfig } from "@playwright/test";

process.env.NODE_ENV = "test";

const webPort = Number(process.env.AEGIS_E2E_WEB_PORT ?? 4175);
const edgePort = Number(process.env.AEGIS_E2E_EDGE_PORT ?? 2569);

export default defineConfig({
  testDir: "./e2e",
  tsconfig: "./e2e/tsconfig.json",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `NODE_OPTIONS=--max-old-space-size=2048 VITE_AEGIS_API_URL=ws://127.0.0.1:${edgePort} pnpm exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
    url: `http://127.0.0.1:${webPort}/e2e/harness.html`,
    reuseExistingServer: false,
  },
});
