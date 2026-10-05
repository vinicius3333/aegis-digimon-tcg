#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/draw-path-measurement/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  await page.goto(new URL("/dev/motion-reference?frame=1728", values.base).href);
  const measured = await page.evaluate(async () => {
    const { DRAW_VIEWER_SEQUENCE, drawViewerSequenceForSource } = await import("/src/dev/motionGeometryModel.ts");
    const manifest = await (await fetch(`/motion-reference/${DRAW_VIEWER_SEQUENCE.reference}/manifest.json`)).json();
    const sequence = drawViewerSequenceForSource(manifest);
    if (!sequence) throw new Error("Draw path belongs to another source hash or decode size");
    const { pose } = sequence;
    const cx = pose.face.x + pose.face.width / 2,
      cy = pose.face.y + pose.face.height / 2;
    async function pixels(frame) {
      const image = new Image();
      image.src = `/motion-reference/${sequence.reference}/frame-${String(frame).padStart(6, "0")}.jpg`;
      await image.decode();
      if (image.naturalWidth !== 960 || image.naturalHeight !== 540)
        throw new Error("Unexpected primary frame dimensions");
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 540;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, 960, 540).data;
    }
    const held = await pixels(pose.frame);
    // Separate art, watermark and name patches; exclude the border and deck counter.
    const patches = [
      { x: 820, y: 282, width: 62, height: 40 },
      { x: 819, y: 328, width: 67, height: 47 },
      { x: 818, y: 390, width: 70, height: 25 },
    ];
    const templates = patches.map((patch) => {
      const points = [];
      for (let y = patch.y; y < patch.y + patch.height; y += 2)
        for (let x = patch.x; x < patch.x + patch.width; x += 2)
          points.push({ x: x - cx, y: y - cy, rgb: [0, 1, 2].map((channel) => held[(y * 960 + x) * 4 + channel]) });
      return points;
    });
    function score(image, progress, horizontal, vertical) {
      const scale = (2 + 2.5 * progress) / 4.5;
      const angle = (60 * (1 - progress) * Math.PI) / 180;
      const cos = Math.cos(angle),
        sin = Math.sin(angle);
      const xCenter = cx + horizontal * (1 - progress),
        yCenter = cy - vertical * (1 - progress);
      const patchScores = [],
        visibleFractions = [];
      for (const template of templates) {
        let count = 0,
          sumO = 0,
          sumE = 0,
          sumOE = 0,
          sumOO = 0,
          sumEE = 0;
        for (const point of template) {
          const x = xCenter + scale * (point.x * cos - point.y * sin);
          const y = yCenter + scale * (point.x * sin + point.y * cos);
          if (x < 0 || x >= 959 || y < 0 || y >= 539) continue;
          const x0 = Math.floor(x),
            y0 = Math.floor(y),
            dx = x - x0,
            dy = y - y0;
          count++;
          for (let channel = 0; channel < 3; channel++) {
            const at = (xx, yy) => image[(yy * 960 + xx) * 4 + channel];
            const observed =
              at(x0, y0) * (1 - dx) * (1 - dy) +
              at(x0 + 1, y0) * dx * (1 - dy) +
              at(x0, y0 + 1) * (1 - dx) * dy +
              at(x0 + 1, y0 + 1) * dx * dy;
            const expected = point.rgb[channel];
            sumO += observed;
            sumE += expected;
            sumOE += observed * expected;
            sumOO += observed * observed;
            sumEE += expected * expected;
          }
        }
        visibleFractions.push(count / template.length);
        if (count / template.length < 0.45) return { correlation: -1, patchScores, visibleFractions };
        const n = count * 3;
        patchScores.push(
          (sumOE - (sumO * sumE) / n) /
            Math.sqrt(Math.max(1e-9, (sumOO - (sumO * sumO) / n) * (sumEE - (sumE * sumE) / n))),
        );
      }
      return {
        correlation: patchScores.reduce((sum, value) => sum + value, 0) / patchScores.length,
        patchScores,
        visibleFractions,
      };
    }
    const rows = [];
    for (const frame of [1719, 1720, 1721, 1722, 1723]) {
      const image = await pixels(frame);
      const paths = {};
      for (const [name, horizontal, vertical] of [
        ["scaledPlane", (pose.face.width * 60) / 45, (pose.face.height * 40) / 63],
        ["shortPlane", pose.face.width * 0.6, (pose.face.height * 2) / 7],
      ]) {
        let best = { correlation: -2 };
        for (let step = 0; step <= 500; step++) {
          const progress = step / 500;
          const candidate = score(image, progress, horizontal, vertical);
          if (candidate.correlation > best.correlation) {
            const clockMs = 60 * (1 - Math.sqrt(1 - progress));
            best = {
              ...candidate,
              progress,
              clockMs,
              seconds: manifest.timestamps[frame],
              inferredStartSeconds: manifest.timestamps[frame] - clockMs / 1000,
              center: { x: cx + horizontal * (1 - progress), y: cy - vertical * (1 - progress) },
            };
          }
        }
        paths[name] = best;
      }
      rows.push({ frame, paths });
    }
    const early = rows.filter((row) => row.frame < 1721);
    const informative = rows.filter((row) => row.frame === 1721 || row.frame === 1722);
    if (
      early.some((row) => row.paths.scaledPlane.correlation > 0.3) ||
      informative.some(
        (row) =>
          row.paths.scaledPlane.correlation < 0.6 ||
          row.paths.scaledPlane.correlation < row.paths.shortPlane.correlation + 0.08,
      )
    )
      throw new Error("Primary patches do not support the scaled-plane entry over the short entry");
    const fittedSpacing = informative[1].paths.scaledPlane.clockMs - informative[0].paths.scaledPlane.clockMs;
    const mediaSpacing = (manifest.timestamps[1722] - manifest.timestamps[1721]) * 1000;
    if (Math.abs(fittedSpacing - mediaSpacing) > 2)
      throw new Error("Independent entry poses do not preserve media-time spacing");
    return {
      reference: sequence.reference,
      sourceHash: sequence.sourceHash,
      pose,
      patches,
      rows,
      fittedSpacing,
      mediaSpacing,
      note: "Three independent patches from a later upright frame support two intermediate entry poses. Blur and overlapping images limit confidence; early/clipped frames are rejected. These are conditional fits to two candidate authored paths, not an independent continuous curve or camera reconstruction.",
    };
  });
  await writeFile(new URL("primary-path.json", output), JSON.stringify(measured, null, 2) + "\n");
  await page.getByRole("checkbox", { name: "Guias da carta e do deck", exact: true }).check();
  const downloadReady = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
  const download = await downloadReady;
  const path = new URL("path-harness-export.json", output).pathname;
  await download.saveAs(path);
  const exported = JSON.parse(await readFile(path, "utf8"));
  if (
    exported.sourceHash !== measured.sourceHash ||
    JSON.stringify(exported.sequence.pose) !== JSON.stringify(measured.pose)
  )
    throw new Error("Harness export lost the measured face and deck guides");
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Pose legível", exact: true }).click();
    await page.locator('img[data-reference-frame="1728"]').waitFor();
    const guides = await page.locator('[data-geometry-guides="draw-pose"] rect').evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: Number(node.getAttribute("x")),
        y: Number(node.getAttribute("y")),
        width: Number(node.getAttribute("width")),
        height: Number(node.getAttribute("height")),
      })),
    );
    if (
      JSON.stringify(guides) !== JSON.stringify([measured.pose.face, measured.pose.deck]) ||
      (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    )
      throw new Error("Pose guides changed geometry or overflowed the harness");
    await page.screenshot({ path: new URL(`path-harness-${width}.png`, output).pathname, fullPage: true });
  }
  await page.getByRole("button", { name: "Deck antes da compra", exact: true }).click();
  await page.locator('img[data-reference-frame="1719"]').waitFor();
  console.log("Primary patch fits, media-time spacing, pose guides/export and 320/1440 px containment passed");
} finally {
  await browser.close();
}
