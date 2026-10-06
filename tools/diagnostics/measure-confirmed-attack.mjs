#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/confirmed-attack-measurement/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(new URL("/dev/motion-reference?frame=29550", values.base).href);
  const measurement = await page.evaluate(async () => {
    const reference = "kYBHuw7ItSg";
    const manifest = await (await fetch(`/motion-reference/${reference}/manifest.json`)).json();
    if (
      manifest.sourceHash !== "e5ae09d8756a68cc293a8c8dbd842a53b20e1813a7dc5d94ddbf9be4020c95d7" ||
      manifest.frameWidth !== 960 ||
      manifest.frameHeight !== 540
    )
      throw new Error("Unexpected source content or decode dimensions");
    async function frame(index) {
      const image = new Image();
      image.src = `/motion-reference/${reference}/frame-${String(index).padStart(6, "0")}.jpg`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      return Float64Array.from(
        { length: canvas.width * canvas.height },
        (_, i) => rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114,
      );
    }
    // Interior artwork excludes the animated selection rim, DP badge and arrow tip.
    const patches = [
      { x: 285, y: 287, width: 26, height: 21 },
      { x: 285, y: 317, width: 25, height: 14 },
    ];
    const restFrame = 29550;
    const rest = await frame(restFrame);
    const templates = patches.map((patch) => {
      const pixels = [];
      for (let y = 0; y < patch.height; y++)
        for (let x = 0; x < patch.width; x++) pixels.push(rest[(patch.y + y) * 960 + patch.x + x]);
      const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
      const centered = pixels.map((value) => value - mean);
      return { patch, centered, norm: centered.reduce((a, b) => a + b * b, 0) };
    });
    const frames = [];
    for (let index = restFrame; index <= 29595; index++) {
      const target = await frame(index);
      const matches = templates.map(({ patch, centered, norm }) => {
        let best = { score: -1, dx: 0, dy: 0 };
        for (let dy = -5; dy <= 5; dy++)
          for (let dx = -5; dx <= 5; dx++) {
            let sum = 0,
              square = 0,
              dot = 0,
              cursor = 0;
            for (let y = 0; y < patch.height; y++)
              for (let x = 0; x < patch.width; x++) {
                const value = target[(patch.y + dy + y) * 960 + patch.x + dx + x];
                sum += value;
                square += value * value;
                dot += value * centered[cursor++];
              }
            const score = dot / Math.sqrt(norm * Math.max(1e-9, square - (sum * sum) / centered.length));
            if (score > best.score) best = { score, dx, dy };
          }
        return best;
      });
      frames.push({ index, seconds: manifest.timestamps[index], matches });
    }
    return {
      reference,
      sourceHash: manifest.sourceHash,
      width: 960,
      height: 540,
      restFrame,
      patches,
      frames,
      note: "Two artwork patches measure translation after the accepted attack, while the card is already suspended. This interval does not measure player dragging, suspension rotation or a field battle impact. Integer-pixel search at the 960×540 decode does not establish subpixel camera motion or full animation parity.",
    };
  });
  await writeFile(new URL("measurement.json", output), JSON.stringify(measurement, null, 2) + "\n");
  const matches = measurement.frames.flatMap((frame) => frame.matches);
  // The lower patch includes changing arrow glow. Require strong correlation
  // in both patches and reject a displaced peak rather than brightness changes.
  if (matches.some((match) => match.score < 0.85 || Math.abs(match.dx) > 1 || Math.abs(match.dy) > 1))
    throw new Error("Confirmed attack artwork moved beyond the measured ±1 px resting anchor");
  console.log(
    JSON.stringify({
      frames: measurement.frames.length,
      patches: measurement.patches.length,
      minimumCorrelation: Math.min(...matches.map((match) => match.score)),
      maximumDisplacementPx: Math.max(...matches.flatMap((match) => [Math.abs(match.dx), Math.abs(match.dy)])),
      seconds: [measurement.frames[0].seconds, measurement.frames.at(-1).seconds],
    }),
  );
} finally {
  await browser.close();
}
