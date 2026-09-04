import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const requestedTestMaxThreads = Number(process.env.TEST_MAX_THREADS ?? 4);
const testMaxThreads =
  Number.isInteger(requestedTestMaxThreads) && requestedTestMaxThreads > 0 ? requestedTestMaxThreads : 4;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Scenario tests (test/) render the real client against the real
      // AegisRoom, imported straight from apps/api source — see
      // the scenario test harness. Not reachable from
      // product code, so it never affects the shipped bundle.
      "@aegis-api": fileURLToPath(new URL("../api/src", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./test/scenarioHarness/setupJsdomPolyfills.ts"],
    // The scenario harness boots a real in-process websocket server; vitest's
    // default forked-process pool serializes console/log traffic across an IPC
    // boundary and chokes on the non-plain objects Colyseus logs there. Threads
    // share memory instead, sidestepping that boundary entirely.
    pool: "threads",
    // Each scenario file boots its own websocket server + Colyseus room + React
    // render tree and drives it through several seconds of real async traffic.
    // With vitest's default worker count (= CPU count), a full-suite run packs
    // that many of these onto the machine at once; under the resulting CPU
    // contention, already-generous 10s findByRole/waitFor timeouts in the
    // heaviest files (attackPermanent, evade, mobileCore, ...) occasionally get
    // starved past their deadline — flaky only in the full run, never in
    // isolation. Capping concurrency gives each scenario server enough CPU
    // headroom to finish inside its timeout. Keep low-memory gates on the thread
    // pool: forcing `forks` makes Colyseus's non-plain log payloads cross IPC and
    // crash Vitest's serializer. Override only the thread count when RAM is constrained.
    maxWorkers: testMaxThreads,
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/scheduler")
          ) {
            return "react-vendor";
          }
          if (id.includes("node_modules/colyseus") || id.includes("node_modules/@colyseus")) {
            return "colyseus-vendor";
          }
          if (id.includes("cards.json") || id.includes("effects.json")) {
            return "cards-data";
          }
        },
      },
    },
  },
});
