import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

process.env.AEGIS_E2E_EDGE_PORT = "2594";
process.env.AEGIS_E2E_SERVER_PORT = "2595";

export default defineConfig({
  ...config,
  testMatch: "**/oct06-group1.spec.ts",
  use: { ...config.use, baseURL: "http://127.0.0.1:4194" },
  webServer: {
    command: "VITE_AEGIS_API_URL=ws://127.0.0.1:2594 pnpm exec vite --host 127.0.0.1 --port 4194 --strictPort",
    url: "http://127.0.0.1:4194/e2e/harness.html",
    reuseExistingServer: true,
  },
});
