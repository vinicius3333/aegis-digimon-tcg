import { defineConfig } from "@playwright/test";

process.env.NODE_ENV = "test";

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
    baseURL: "http://127.0.0.1:4175",
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command:
      "NODE_OPTIONS=--max-old-space-size=2048 VITE_AEGIS_API_URL=ws://127.0.0.1:2569 pnpm exec vite --host 127.0.0.1 --port 4175 --strictPort",
    url: "http://127.0.0.1:4175/e2e/harness.html",
    reuseExistingServer: false,
  },
});
