import { fileURLToPath } from "node:url";
import { build, preview } from "vite";

// Exercise the shipped CSS pipeline with the real GameScreen harness. Development
// style tags can conceal production-only minifier regressions (#65/#67).
const port = Number(process.env.AEGIS_E2E_WEB_PORT ?? 4175);
const root = fileURLToPath(new URL("../", import.meta.url));
const outDir = `/tmp/aegis-browser-production-${port}`;
const shared = {
  root,
  configFile: `${root}vite.config.ts`,
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: { app: `${root}index.html`, harness: `${root}e2e/harness.html` } },
  },
};
await build(shared);
const server = await preview({
  ...shared,
  preview: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    proxy: {
      "/assets/card-images": {
        target: "https://web-garage.takaotaku.de",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/assets\/card-images/, ""),
      },
    },
  },
});
server.printUrls();
