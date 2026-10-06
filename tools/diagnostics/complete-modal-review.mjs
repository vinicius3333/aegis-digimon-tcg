import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const require = createRequire(resolve(root, "apps/web/package.json"));
const { chromium } = require("@playwright/test");
const output = resolve(root, "apps/web/public/dev/modal-review");
const cases = JSON.parse(readFileSync(resolve(output, "manifest.json"), "utf8"));
const browser = await chromium.launch();
const context = await browser.newContext({ locale: "pt-BR", reducedMotion: "reduce" });
await context.addInitScript(() => localStorage.setItem("aegis:locale", "pt-BR"));
const page = await context.newPage();
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
try {
  for (const item of cases.filter((entry) => !requested.length || requested.includes(entry.id))) {
    for (const [format, width, height] of [
      ["mobile", 390, 844],
      ["desktop", 1440, 1000],
    ]) {
      const path = resolve(output, `${item.id}-${format}.png`);
      if (!process.argv.includes("--refresh") && existsSync(path)) continue;
      await page.setViewportSize({ width, height });
      await page.goto(`http://localhost:5184${item.url}`);
      await page.locator(item.url.startsWith("/dev/mobile") ? ".mobile-lab-frame" : ".effect-prompt-gallery").waitFor();
      if (item.answer !== undefined) {
        await page
          .getByRole("dialog")
          .getByRole("button", { name: item.answer ? /^sim|^yes|^use$/i : /^não,|^no,/i })
          .click();
        await page.locator(".material-prompt").waitFor();
      }
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const image of document.images) image.loading = "eager";
      });
      await page.waitForFunction(() => [...document.images].every((image) => image.complete), undefined, {
        timeout: 15000,
      });
      await page.screenshot({ path, animations: "disabled" });
      process.stdout.write(`${item.id} ${format}\n`);
    }
  }
} finally {
  await browser.close();
}
