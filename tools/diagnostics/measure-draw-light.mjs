#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/draw-light-measurement/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  await page.goto(new URL("/dev/motion-reference?frame=1725", values.base).href);
  const measured = await page.evaluate(async () => {
    const { DRAW_VIEWER_SEQUENCE, drawViewerSequenceForSource } = await import("/src/dev/motionGeometryModel.ts");
    const manifest = await (await fetch(`/motion-reference/${DRAW_VIEWER_SEQUENCE.reference}/manifest.json`)).json();
    const sequence = drawViewerSequenceForSource(manifest);
    if (!sequence) throw new Error("Draw light belongs to another source hash or decode size");
    const { region, baselineFrame, observations } = sequence.light;
    async function pixels(frame) {
      const image = new Image();
      image.src = `/motion-reference/${sequence.reference}/frame-${String(frame).padStart(6, "0")}.jpg`;
      await image.decode();
      if (image.naturalWidth !== 960 || image.naturalHeight !== 540)
        throw new Error("Unexpected primary frame dimensions");
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
      return context.getImageData(0, 0, region.width, region.height).data;
    }
    const baseline = await pixels(baselineFrame);
    const frames = await Promise.all(observations.map(async (row) => ({ row, rgba: await pixels(row.frame) })));
    const rows = frames.map(({ row, rgba }) => {
      let sum = 0,
        active = 0;
      for (let index = 0; index < rgba.length; index += 4) {
        const delta =
          (rgba[index] - baseline[index]) * 0.2126 +
          (rgba[index + 1] - baseline[index + 1]) * 0.7152 +
          (rgba[index + 2] - baseline[index + 2]) * 0.0722;
        sum += Math.max(0, delta);
        if (delta > 25) active += 1;
      }
      const meanPositiveLuma = sum / (rgba.length / 4);
      if (Math.abs(meanPositiveLuma - row.meanPositiveLuma) > 0.02)
        throw new Error(`Primary pixels disagree with the recorded light measurement at ${row.frame}`);
      return {
        frame: row.frame,
        seconds: manifest.timestamps[row.frame],
        meanPositiveLuma,
        activeFraction: active / (rgba.length / 4),
      };
    });
    return {
      reference: sequence.reference,
      sourceHash: sequence.sourceHash,
      frameSize: [960, 540],
      region,
      baselineFrame,
      rows,
      note: "Positive Rec.709-weighted encoded RGB luminance difference against the pre-flash field. This is a rendered-region envelope, not linear light, particle alpha or camera reconstruction; it excludes the temporary card.",
    };
  });
  await writeFile(new URL("primary-envelope.json", output), JSON.stringify(measured, null, 2) + "\n");
  await page.getByRole("button", { name: "Pico do clarão", exact: true }).click();
  await page.locator('img[data-reference-frame="1725"]').waitFor();
  const downloadReady = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
  const download = await downloadReady;
  const path = new URL("harness-export.json", output).pathname;
  await download.saveAs(path);
  const exported = JSON.parse(await readFile(path, "utf8"));
  if (
    exported.sourceHash !== measured.sourceHash ||
    exported.sequence.light.observations.length !== measured.rows.length ||
    exported.sequence.light.observations.some(
      (row, index) => row.frame !== measured.rows[index].frame || row.seconds !== measured.rows[index].seconds,
    )
  )
    throw new Error("Harness export lost the measured light's frame identity or media timestamps");
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("img", { name: "Intensidade medida do clarão", exact: true }).waitFor();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error("Light chart overflowed the harness");
    await page.screenshot({ path: new URL(`harness-${width}.png`, output).pathname, fullPage: true });
  }
  await page.getByRole("button", { name: "Fim do clarão", exact: true }).click();
  await page.locator('img[data-reference-frame="1730"]').waitFor();
  console.log("Eight primary-frame light measurements, media-time export and 320/1440 px harness containment passed");
} finally {
  await browser.close();
}
