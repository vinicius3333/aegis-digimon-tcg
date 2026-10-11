import { defineConfig } from "@playwright/test";

const baseURL = process.env.AEGIS_GUIDES_BASE_URL;
if (!baseURL) throw new Error("Set AEGIS_GUIDES_BASE_URL to the gateway serving the published web build.");
const browserName = process.env.AEGIS_E2E_BROWSER ?? "chromium";
if (browserName !== "chromium" && browserName !== "firefox") {
  throw new Error("AEGIS_E2E_BROWSER must be chromium or firefox.");
}

export default defineConfig({
  testDir: "./e2e",
  tsconfig: "./e2e/tsconfig.json",
  testMatch: "strategy-guides.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    locale: "en-US",
    actionTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: browserName, use: { browserName } }],
});
