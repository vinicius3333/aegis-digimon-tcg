#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/hand-hover-measurement/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL("/dev/motion-reference?frame=2071", values.base).href);
  await page.locator('img[data-reference-frame="2071"]').waitFor();
  const measured = await page.evaluate(async () => {
    const {
      HAND_HOVER_GEOMETRY: geometry,
      handHoverGeometryForSource,
      relativeCardGeometry,
    } = await import("/src/dev/motionGeometryModel.ts");
    const manifest = await (await fetch(`/motion-reference/${geometry.reference}/manifest.json`)).json();
    if (!handHoverGeometryForSource(manifest))
      throw new Error("Measurement belongs to another source hash or decode size");
    async function frame(index) {
      const image = new Image();
      image.src = `/motion-reference/${geometry.reference}/frame-${String(index).padStart(6, "0")}.jpg`;
      await image.decode();
      return image;
    }
    const rest = await frame(geometry.restFrame),
      focused = await frame(geometry.focusedFrame);
    function gray(image, x, y, w, h, targetW = w, targetH = h) {
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const context = canvas.getContext("2d");
      context.drawImage(image, x, y, w, h, 0, 0, targetW, targetH);
      const rgba = context.getImageData(0, 0, targetW, targetH).data;
      return Float64Array.from(
        { length: targetW * targetH },
        (_, i) => rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114,
      );
    }
    // Independent artwork patches avoid the changing rim/cost overlays and clipped bottom.
    const region = { x: 330, y: 365, width: 160, height: 100 };
    const target = gray(focused, region.x, region.y, region.width, region.height);
    const patches = [
      { x: 380, y: 465, width: 60, height: 35 },
      { x: 385, y: 490, width: 50, height: 40 },
    ];
    const matches = [];
    for (const patch of patches) {
      let best = { score: -1 };
      for (let step = 0; step <= 8; step++) {
        const scale = 1.1 + step * 0.025;
        const w = Math.round(patch.width * scale),
          h = Math.round(patch.height * scale);
        const template = gray(rest, patch.x, patch.y, patch.width, patch.height, w, h);
        const mean = template.reduce((a, b) => a + b, 0) / template.length;
        let norm = 0;
        for (let i = 0; i < template.length; i++) {
          template[i] -= mean;
          norm += template[i] ** 2;
        }
        for (let y = 0; y <= region.height - h; y++)
          for (let x = 0; x <= region.width - w; x++) {
            let sum = 0,
              square = 0,
              dot = 0;
            for (let py = 0; py < h; py++)
              for (let px = 0; px < w; px++) {
                const value = target[(y + py) * region.width + x + px];
                sum += value;
                square += value * value;
                dot += value * template[py * w + px];
              }
            const score = dot / Math.sqrt(norm * Math.max(1e-9, square - (sum * sum) / template.length));
            if (score > best.score) best = { score, scale, x: x + region.x, y: y + region.y };
          }
      }
      const root = {
        x: best.x - (patch.x - geometry.rest.x) * best.scale,
        y: best.y - (patch.y - geometry.rest.y) * best.scale,
        width: geometry.rest.width * best.scale,
        height: geometry.rest.height * best.scale,
      };
      matches.push({ patch, best, inferredRoot: root, relative: relativeCardGeometry(geometry.rest, root) });
    }
    function correlation(a, b) {
      const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
      const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
      let dot = 0,
        normA = 0,
        normB = 0;
      for (let i = 0; i < a.length; i++) {
        const da = a[i] - meanA,
          db = b[i] - meanB;
        dot += da * db;
        normA += da * da;
        normB += db * db;
      }
      if (!(normA > 0 && normB > 0)) throw new Error("A primary artwork patch has no measurable variance");
      const result = dot / Math.sqrt(normA * normB);
      if (!Number.isFinite(result)) throw new Error("Primary artwork correlation is not finite");
      return result;
    }
    const { focusedPatch, restingPatch } = geometry.release;
    const samplePatch = (image, patch) => gray(image, patch.x, patch.y, patch.width, patch.height);
    const focusedTemplate = samplePatch(focused, focusedPatch);
    const restingTemplate = samplePatch(rest, restingPatch);
    const release = [];
    for (const expected of geometry.release.observations) {
      const image = await frame(expected.frame);
      const focusedCorrelation = correlation(focusedTemplate, samplePatch(image, focusedPatch));
      const restingCorrelation = correlation(restingTemplate, samplePatch(image, restingPatch));
      if (
        Math.abs(focusedCorrelation - expected.focusedCorrelation) > 0.002 ||
        Math.abs(restingCorrelation - expected.restingCorrelation) > 0.002
      )
        throw new Error(`Primary release correlation changed at ${expected.frame}`);
      release.push({
        frame: expected.frame,
        seconds: manifest.timestamps[expected.frame],
        focusedCorrelation,
        restingCorrelation,
      });
    }
    const before = release.find((row) => row.frame === geometry.release.lastFocusedFrame);
    const after = release.find((row) => row.frame === geometry.release.restingFrame);
    if (
      before.focusedCorrelation < 0.99 ||
      before.restingCorrelation > 0.05 ||
      after.restingCorrelation < 0.95 ||
      after.focusedCorrelation > 0.1
    )
      throw new Error("Primary frames no longer distinguish the focused and returned artwork poses");
    return {
      geometry,
      sourceHash: manifest.sourceHash,
      seconds: [manifest.timestamps[geometry.restFrame], manifest.timestamps[geometry.focusedFrame]],
      matches,
      release,
      note: "Image correlation measures a selection hover and its pointer-driven return, not effect activation. Resting root bounds and hidden bottom use the measured 100px width and authored 100:140 aspect. A mixed recorded frame limits continuous timing claims; camera and a different client build remain unproven.",
    };
  });
  await writeFile(new URL("measurement.json", output), JSON.stringify(measured, null, 2));
  for (const match of measured.matches) {
    if (
      match.best.score < 0.93 ||
      Math.abs(match.best.scale - 1.2) > 0.026 ||
      Math.abs(match.inferredRoot.x - measured.geometry.focused.x) > 2 ||
      Math.abs(match.inferredRoot.y - measured.geometry.focused.y) > 2
    )
      throw new Error(`Artwork correlation diverged: ${JSON.stringify(match)}`);
  }
  await page.getByRole("checkbox", { name: "Guias de duas poses" }).check();
  await page.getByRole("button", { name: "Ir ao hover", exact: true }).click();
  await page.locator('img[data-reference-frame="2099"]').waitFor();
  await page.screenshot({ path: new URL("harness-poses.png", output).pathname });
  const downloadReady = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
  const download = await downloadReady;
  const exportPath = new URL("harness-export.json", output).pathname;
  await download.saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  if (
    exported.sourceHash !== measured.sourceHash ||
    exported.geometry.restFrame !== 2071 ||
    exported.geometry.focusedFrame !== 2099 ||
    exported.geometry.release.observations.some((row, i) => row.seconds !== measured.release[i].seconds)
  )
    throw new Error("Harness export did not preserve the measured source and pose identity");
  await page.setViewportSize({ width: 320, height: 900 });
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Antes de sair do hover", exact: true }).click();
    await page.locator('img[data-reference-frame="2105"]').waitFor();
    await page.getByRole("button", { name: "Após sair do hover", exact: true }).click();
    await page.locator('img[data-reference-frame="2107"]').waitFor();
    if (
      (await page.getByRole("img", { name: "Correlação das poses ao sair do hover", exact: true }).count()) !== 1 ||
      (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    )
      throw new Error("Hover release chart/navigation overflowed or lost its observed frames");
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: new URL("harness-poses-phone.png", output).pathname });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw new Error("Phone harness overflowed horizontally");
  if (errors.length) throw new Error(errors.join("; "));
  const replaced = await browser.newPage();
  await replaced.route("**/motion-reference/kYBHuw7ItSg/manifest.json", async (route) => {
    const response = await route.fetch();
    const original = await response.json();
    await route.fulfill({ response, json: { ...original, sourceHash: "replacement" } });
  });
  await replaced.goto(new URL("/dev/motion-reference?frame=2107", values.base).href);
  await replaced.getByRole("region", { name: "Referência em vídeo", exact: true }).waitFor();
  if (await replaced.getByRole("button", { name: "Após sair do hover", exact: true }).count())
    throw new Error("Replacement source retained hover release controls");
  const replacedDownload = replaced.waitForEvent("download");
  await replaced.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
  const replacedPath = new URL("replacement-export.json", output).pathname;
  await (await replacedDownload).saveAs(replacedPath);
  if (JSON.parse(await readFile(replacedPath, "utf8")).geometry !== null)
    throw new Error("Replacement source exported primary hover observations");
  await replaced.close();
  console.log(
    JSON.stringify(
      {
        sourceHash: measured.sourceHash,
        seconds: measured.seconds,
        matches: measured.matches.map(({ best, relative }) => ({ ...best, localLift: relative.localLift })),
        release: measured.release,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
