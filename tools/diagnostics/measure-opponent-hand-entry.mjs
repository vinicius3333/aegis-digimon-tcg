#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/opponent-hand-entry-measurement/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(new URL("/dev/motion-reference?frame=4237", values.base).href);
  const measurement = await page.evaluate(async () => {
    const { DRAW_OPPONENT_SEQUENCE, drawOpponentSequenceForSource } = await import("/src/dev/motionGeometryModel.ts");
    const manifest = await (await fetch(`/motion-reference/${DRAW_OPPONENT_SEQUENCE.reference}/manifest.json`)).json();
    const sequence = drawOpponentSequenceForSource(manifest);
    if (!sequence) throw new Error("Opponent observations belong to another source/decode size");
    const region = sequence.entry.region;
    async function pixels(frame) {
      const image = new Image();
      image.src = `/motion-reference/${sequence.reference}/frame-${String(frame).padStart(6, "0")}.jpg`;
      await image.decode();
      if (image.naturalWidth !== 960 || image.naturalHeight !== 540) throw new Error("Wrong primary frame dimensions");
      const canvas = document.createElement("canvas");
      canvas.width = region.width;
      canvas.height = region.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
      return context.getImageData(0, 0, region.width, region.height).data;
    }
    const baseline = await pixels(sequence.entry.baselineFrame);
    const observations = [];
    for (const expected of sequence.entry.observations) {
      const image = await pixels(expected.frame);
      let sum = 0;
      for (let i = 0; i < image.length; i++) if (i % 4 !== 3) sum += Math.abs(image[i] - baseline[i]);
      const meanAbsoluteRgb = sum / (region.width * region.height * 3);
      if (Math.abs(meanAbsoluteRgb - expected.meanAbsoluteRgb) > 0.05)
        throw new Error(`Primary intrusion observation changed at ${expected.frame}: ${meanAbsoluteRgb}`);
      observations.push({ frame: expected.frame, meanAbsoluteRgb, seconds: manifest.timestamps[expected.frame] });
    }
    const peak = observations.find((row) => row.frame === 4237).meanAbsoluteRgb;
    if (
      peak < 20 ||
      observations.filter((row) => row.frame !== 4237 && row.frame !== 4238).some((row) => row.meanAbsoluteRgb > 0.1)
    )
      throw new Error("The below-hand region no longer supports the displaced opaque back");
    return {
      sourceHash: manifest.sourceHash,
      reference: manifest.id,
      entry: sequence.entry,
      observations,
      note: "Encoded RGB difference below the resting hand proves a visible downward intrusion in these samples. Approximate rectangle bounds support a half-height offset; neither is an independent continuous curve, exact start clock or camera reconstruction.",
    };
  });
  await writeFile(new URL("primary-observations.json", output), JSON.stringify(measurement, null, 2));
  const source = page.getByRole("region", { name: "Referência em vídeo", exact: true });
  await source.getByLabel("Trecho").selectOption("draw-opponent");
  const bounds = await source
    .getByLabel("Frame da referência", { exact: true })
    .evaluate((node) => ({ first: Number(node.min), last: Number(node.max) }));
  if (bounds.first !== 4224 || bounds.last !== 4243) throw new Error("Opponent clip lost its primary bounds");
  if ((await source.getByRole("img", { name: "Diferença medida abaixo da mão", exact: true }).count()) !== 1)
    throw new Error("Opponent measurement chart is missing");
  await source.getByRole("checkbox", { name: "Guias da entrada do oponente", exact: true }).check();
  const downloading = page.waitForEvent("download");
  await source.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
  const download = await downloading;
  const exportPath = new URL("harness-export.json", output).pathname;
  await download.saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  if (
    exported.sourceHash !== measurement.sourceHash ||
    JSON.stringify(exported.opponentSequence.entry.region) !== JSON.stringify(measurement.entry.region) ||
    exported.opponentSequence.entry.observations.some((row, i) => row.seconds !== measurement.observations[i].seconds)
  )
    throw new Error("Opponent export lost source-bound measurements/media times");
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await source.getByRole("button", { name: "Verso abaixo da mão", exact: true }).click();
    await source.locator('img[data-reference-frame="4237"]').waitFor();
    const guides = await source.locator('[data-geometry-guides="opponent-entry"] rect').evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: Number(node.getAttribute("x")),
        y: Number(node.getAttribute("y")),
        width: Number(node.getAttribute("width")),
        height: Number(node.getAttribute("height")),
      })),
    );
    if (
      JSON.stringify(guides) !==
        JSON.stringify([measurement.entry.moving, measurement.entry.settled, measurement.entry.region]) ||
      (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    )
      throw new Error("Opponent guides changed geometry or page containment");
    await page.screenshot({ path: new URL(`reference-${width}.png`, output).pathname, fullPage: true });
    await source.getByRole("button", { name: "Verso assentado", exact: true }).click();
    await source.locator('img[data-reference-frame="4242"]').waitFor();
  }
  await page.close();
  const replacement = await browser.newPage();
  await replacement.route("**/motion-reference/kYBHuw7ItSg/manifest.json", async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    await route.fulfill({ response, json: { ...json, sourceHash: "replacement" } });
  });
  await replacement.goto(new URL("/dev/motion-reference?frame=4237", values.base).href);
  await replacement.getByRole("region", { name: "Referência em vídeo", exact: true }).waitFor();
  if (await replacement.getByLabel("Marcos da compra do oponente").count())
    throw new Error("Replacement retained opponent observations");
  const changedDownload = replacement.waitForEvent("download");
  await replacement.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
  const changed = await changedDownload;
  const changedPath = new URL("replacement-export.json", output).pathname;
  await changed.saveAs(changedPath);
  if (JSON.parse(await readFile(changedPath, "utf8")).opponentSequence !== null)
    throw new Error("Replacement exported primary opponent observations");
  await replacement.close();
  const captures = [];
  for (const width of [320, 1440]) {
    const arena = await browser.newPage({ viewport: { width, height: 900 } });
    await arena.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await arena.goto(new URL("/dev/arena?mode=visual", values.base).href);
    await arena.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
    await arena.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      const counter = (prefix) =>
        Number(document.querySelector(`button[aria-label^="${prefix}:"]`).getAttribute("aria-label").match(/\d+/)[0]);
      const baseline = { hand: counter("Hand"), deck: counter("Deck") };
      const capture = (window.aegisOpponentEntryCapture = { baseline, samples: [], done: false });
      const oldCount = document.querySelectorAll("[data-opponent-hand-slot]").length;
      const start = performance.now();
      function sample(now) {
        const root = document.querySelector(`[data-opponent-hand-slot="${oldCount}"]`);
        const style = root ? getComputedStyle(root) : undefined;
        const animation = root?.getAnimations().find((entry) => entry.animationName === "battle-opponent-hand-entry");
        capture.samples.push({
          elapsed: now - start,
          hand: counter("Hand"),
          deck: counter("Deck"),
          clock: animation?.currentTime ?? null,
          duration: animation?.effect.getComputedTiming().duration ?? null,
          y: style ? parseFloat(style.translate.split(" ")[1] ?? "0") : null,
          opacity: style ? Number(style.opacity) : null,
          identity: root?.dataset.handInstanceId ?? null,
          temporary: document.querySelectorAll("[data-draw-presentation-key]").length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        });
        capture.done = root && Number(animation?.currentTime) >= 80 && now - start > 1200;
        if (!capture.done && now - start < 7000) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await arena.getByRole("button", { name: "Demo tools", exact: true }).click();
    await arena.getByRole("menuitem", { name: "Draw opponent card", exact: true }).click();
    await arena.keyboard.press("Escape");
    await arena.waitForFunction(() => window.aegisOpponentEntryCapture.done);
    const capture = await arena.evaluate(() => window.aegisOpponentEntryCapture);
    await writeFile(new URL(`draw-${width}.json`, output), JSON.stringify(capture, null, 2));
    const moving = capture.samples.filter((row) => row.clock > 0 && row.clock < 80);
    if (moving.length < 2 || moving[0].y < 0 || !capture.samples.some((row) => row.temporary === 1))
      throw new Error("Natural opaque draw did not enter from below its slot");
    for (const row of moving) {
      const t = row.clock / 80;
      const expected = -50 * (2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2);
      if (Math.abs(row.y - expected) > 0.025 || row.duration !== 80 || row.opacity !== 1)
        throw new Error("Opaque draw entry differs from the authored OutBack clock");
    }
    if (
      capture.samples.some(
        (row) =>
          row.overflow ||
          row.identity !== null ||
          row.hand + row.deck !== capture.baseline.hand + capture.baseline.deck,
      )
    )
      throw new Error("Opaque entry leaked identity, overflowed or changed conserved counts");
    captures.push({ width, movingSamples: moving.length });
    await arena.close();
  }
  await writeFile(new URL("summary.json", output), JSON.stringify({ captures, replacementGuard: true }, null, 2));
  console.log(
    "11 primary below-hand measurements, source-bound guides/export/replacement guard and two natural opponent draw entries passed",
  );
} finally {
  await browser.close();
}
