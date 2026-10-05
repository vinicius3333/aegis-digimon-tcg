#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, ".local/motion-reference/aegis-field-focus");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: output, size: { width: 1280, height: 800 } },
});
const measurements = [];
try {
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  for (const timing of ["Start of Main Phase", "On Play"]) {
    await page.getByRole("button", { name: "Demo tools", exact: true }).click();
    await page.getByRole("menuitem", { name: `Preview activation: ${timing}`, exact: true }).click();
    await page.locator("[data-testid=effect-focus]").waitFor();
    measurements.push(
      await page.evaluate(
        (label) => ({
          label,
          pageTimeMs: performance.now(),
          sourceCardId: document.querySelector("[data-testid=effect-focus]")?.getAttribute("data-source-card-id"),
          animations: document
            .getAnimations()
            .filter((animation) => animation.animationName === "battle-field-activation-light")
            .map((animation) => ({
              currentTime: animation.currentTime,
              duration: animation.effect.getTiming().duration,
            })),
        }),
        timing,
      ),
    );
    await page.waitForFunction(() => !document.querySelector("[data-testid=effect-focus]"));
  }
  const video = page.video();
  await context.close();
  const input = path.join(output, "reference.webm");
  await video.saveAs(input);
  await writeFile(
    path.join(output, "capture.json"),
    JSON.stringify(
      {
        viewport: { width: 1280, height: 800 },
        measurements,
        note: "Page clock is not the recorder clock. Locate each onset in the decoded frames; do not treat this as deterministic 60fps replay.",
      },
      null,
      2,
    ) + "\n",
  );
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(root, "tools/diagnostics/prepare-motion-reference.mjs"),
        "--input",
        input,
        "--id",
        "aegis-field-focus",
        "--title",
        "Aegis · ativação no campo",
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
  });
  console.log("Compare /dev/motion-reference?comparison=aegis-field-focus (recording FPS is indexed from the file).");
} finally {
  await context.close();
  await browser.close();
}
