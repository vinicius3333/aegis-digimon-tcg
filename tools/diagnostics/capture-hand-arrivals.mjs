#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    "reference-only": { type: "boolean", default: false },
  },
});
const output = new URL("../../.local/motion-reference/aegis-hand-arrivals/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const sourceHash = "e5ae09d8756a68cc293a8c8dbd842a53b20e1813a7dc5d94ddbf9be4020c95d7";

async function verifyReference(width, replaced = false) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
  try {
    if (replaced) {
      await page.route("**/motion-reference/kYBHuw7ItSg/manifest.json", async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        await route.fulfill({ response, json: { ...json, sourceHash: "replacement" } });
      });
    }
    await page.goto(new URL("/dev/motion-reference?frame=1732", values.base).href);
    const source = page.getByRole("region", { name: "Referência em vídeo", exact: true });
    await source.getByLabel("Trecho").selectOption("draw-viewer");
    const scrubber = source.getByLabel("Frame da referência", { exact: true });
    const bounds = await scrubber.evaluate((element) => ({ first: Number(element.min), last: Number(element.max) }));
    if (bounds.first !== 1716 || bounds.last !== 1755)
      throw new Error(`Draw reference clip has wrong decoded bounds: ${JSON.stringify(bounds)}`);
    const markers = [
      [1720, "Primeiro movimento"],
      [1724, "Carta e clarão"],
      [1730, "Saída da apresentação"],
      [1732, "Entrada na mão"],
      [1738, "Carta assentada"],
    ];
    if (replaced) {
      if (await source.getByLabel("Marcos da compra").count())
        throw new Error("Replacement source retained primary draw markers");
    } else {
      for (const [frame, label] of markers) {
        await source.getByRole("button", { name: label, exact: true }).click();
        await source.locator(`img[data-reference-frame="${frame}"]`).waitFor();
        const image = await source.locator(`img[data-reference-frame="${frame}"]`).evaluate((element) => ({
          complete: element.complete,
          width: element.naturalWidth,
          height: element.naturalHeight,
          url: element.src,
        }));
        if (
          !image.complete ||
          image.width !== 960 ||
          image.height !== 540 ||
          !image.url.endsWith(`frame-${String(frame).padStart(6, "0")}.jpg`)
        )
          throw new Error(`Draw marker did not show the primary decoded frame ${frame}`);
      }
    }
    const pending = page.waitForEvent("download");
    await source.getByRole("button", { name: "Exportar medições e notas", exact: true }).click();
    const download = await pending;
    const path = new URL(`reference-${width}${replaced ? "-replacement" : ""}.json`, output).pathname;
    await download.saveAs(path);
    const report = JSON.parse(await readFile(path, "utf8"));
    if (replaced) {
      if (report.sequence !== null || report.geometry !== null)
        throw new Error("Replacement source exported primary measurements");
    } else if (
      report.sourceHash !== sourceHash ||
      report.sequence.sourceHash !== sourceHash ||
      report.sequence.uncertaintyFrames !== 1 ||
      report.sequence.markers.some(
        (marker, index) => marker.frame !== markers[index][0] || typeof marker.seconds !== "number",
      ) ||
      report.sequence.markers.length !== 5
    )
      throw new Error("Draw reference export lost its primary markers, time or uncertainty");
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error(`${width}px: reference markers overflow the page`);
    await page.screenshot({
      path: new URL(`reference-${width}${replaced ? "-replacement" : ""}.png`, output).pathname,
    });
    console.log(
      `${width}px reference${replaced ? " replacement" : ""}: decoded markers, export and containment passed`,
    );
    return { width, replaced, bounds, report };
  } finally {
    await page.close();
  }
}

function verifyCurve(sample) {
  const progress = Math.min(1, Math.max(0, sample.clock / 80));
  const t = progress - 1;
  // Independent OutBack polynomial, rather than CSS easing progress or a pose
  // copied from the production component. s is the default overshoot amplitude.
  const eased = 1 + t * t * ((1.70158 + 1) * t + 1.70158);
  const expected = (1 - eased) / 2;
  if (sample.duration !== 80 || Math.abs(sample.normalizedY - expected) > 0.00001)
    throw new Error(`Hand entry differs from the 80 ms OutBack trajectory: ${JSON.stringify(sample)}`);
}

try {
  for (const width of values["reference-only"] ? [] : [320, 768, 1024, 1440]) {
    for (const reduced of [false, true]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
        await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() =>
          Promise.all([...document.querySelectorAll('[data-testid="hand"] img')].map((image) => image.decode())),
        );
        // Observe natural playback. This part never seeks, pauses or changes a clock.
        await page.evaluate(() => {
          const before = new Set(
            [...document.querySelectorAll('[data-testid="hand"] [data-hand-instance-id]')].map(
              (card) => card.dataset.handInstanceId,
            ),
          );
          const row = document.querySelector('[data-testid="hand"]');
          const capture = (window.aegisHandArrivalCapture = {
            samples: [],
            pending: [],
            complete: false,
            before: before.size,
            row: row.getBoundingClientRect().toJSON(),
          });
          let start;
          function sample(now) {
            const card = [...row.querySelectorAll("[data-hand-instance-id]")].find(
              (candidate) => !before.has(candidate.dataset.handInstanceId),
            );
            if (card) {
              if (card.classList.contains("game-hand-card--arrival-pending")) {
                capture.pending.push({
                  time: now,
                  visibility: getComputedStyle(card).visibility,
                  animationCount: card.getAnimations().filter((entry) => entry.animationName === "battle-hand-draw")
                    .length,
                });
                requestAnimationFrame(sample);
                return;
              }
              start ??= now;
              const style = getComputedStyle(card);
              const face = card.firstElementChild;
              const height = parseFloat(style.height);
              const token = style.translate.split(" ")[1] || "0";
              const animation = card.getAnimations().find((entry) => entry.animationName === "battle-hand-draw");
              const image = card.querySelector("img");
              const bounds = face.getBoundingClientRect();
              const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 5);
              capture.samples.push({
                elapsed: now - start,
                id: card.dataset.handInstanceId,
                clock: animation?.currentTime,
                duration: animation?.effect.getComputedTiming().duration,
                normalizedY: token.endsWith("%") ? parseFloat(token) / 100 : parseFloat(token) / height,
                opacity: Number(style.opacity),
                faceOpacity: Number(getComputedStyle(face).opacity),
                faceWidth: parseFloat(getComputedStyle(face).width),
                faceHeight: parseFloat(getComputedStyle(face).height),
                faceDecoded: !!image?.complete && image.naturalWidth > 0,
                exposed: !!hit && card.contains(hit),
                count: row.querySelectorAll("[data-hand-instance-id]").length,
                row: row.getBoundingClientRect().toJSON(),
                overflow: document.documentElement.scrollWidth > innerWidth,
              });
              capture.complete = now - start >= 350;
            }
            if (!capture.complete) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        });
        await page.getByRole("button", { name: "Demo tools", exact: true }).click();
        await page.getByRole("menuitem", { name: "Draw your card", exact: true }).click();
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => window.aegisHandArrivalCapture.complete);
        const live = await page.evaluate(() => window.aegisHandArrivalCapture);
        await writeFile(
          new URL(`live-${width}${reduced ? "-reduced" : ""}.json`, output),
          JSON.stringify(live, null, 2) + "\n",
        );
        if (
          live.samples.length < 15 ||
          live.samples.some(
            (sample) =>
              sample.opacity !== 1 ||
              sample.faceOpacity !== 1 ||
              sample.overflow ||
              sample.count !== live.before + 1 ||
              sample.id !== "draw-0-0",
          )
        )
          throw new Error(`${width}px: draw changed physical identity, opacity, membership or page width`);
        if (
          live.samples.some(
            (sample) =>
              Math.abs(sample.row.height - live.row.height) > 0.001 ||
              Math.abs(sample.row.width - live.row.width) > 0.001,
          )
        )
          throw new Error(`${width}px: draw changed the hand's reserved geometry`);
        if (!live.samples.at(-1).faceDecoded) throw new Error(`${width}px: drawn artwork never decoded`);
        if (live.pending.some((sample) => sample.visibility !== "hidden" || sample.animationCount !== 0))
          throw new Error(`${width}px: entry ran before its incoming face decoded`);
        if (reduced) {
          if (live.samples.some((sample) => sample.clock !== undefined || sample.normalizedY !== 0))
            throw new Error(`${width}px: reduced hand retained its arrival animation`);
        } else {
          for (const sample of live.samples) verifyCurve(sample);
          const moving = live.samples.filter((sample) => sample.clock < 80);
          if (moving.length < 3 || moving.some((sample) => !sample.faceDecoded))
            throw new Error(`${width}px: insufficient naturally painted arrival artwork`);
          if (moving.filter((sample) => sample.exposed).length < 2)
            throw new Error(`${width}px: arriving face was occluded throughout its natural movement`);
          const settled = live.samples.filter((sample) => sample.clock >= 80);
          if (settled.length < 10 || settled.some((sample) => sample.normalizedY !== 0))
            throw new Error(`${width}px: drawn card did not keep its resting pose`);
        }
        await page.screenshot({ path: new URL(`arena-${width}${reduced ? "-reduced" : ""}.png`, output).pathname });
        // Separate production Hand component. These clocks are deliberately sought
        // to test the exact start, overshoot, endpoint and retained CSS identity.
        const probe = await page.evaluate(async (reduce) => {
          const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const { Hand } = await import("/src/game/piece/Hand.tsx");
          const owner = await (await fetch("/src/game/piece/Hand.tsx")).text();
          const i18n = owner.match(/from "([^"]*\/i18n\/index\.tsx[^"]*)"/)?.[1];
          if (!i18n) throw new Error("Hand provider import was not resolved");
          const { I18nProvider } = await import(i18n);
          const host = document.createElement("div");
          Object.assign(host.style, {
            position: "fixed",
            top: "250px",
            left: "16px",
            width: "calc(100vw - 32px)",
            zIndex: 1000,
          });
          document.body.append(host);
          const root = createRoot(host);
          const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
          const originalDecode = HTMLImageElement.prototype.decode;
          let releaseDecode;
          const decodeGate = new Promise((resolve) => {
            releaseDecode = resolve;
          });
          // An isolated adversarial loading probe. Natural Arena playback above
          // uses the browser's unchanged decoding and animation clocks.
          HTMLImageElement.prototype.decode = async function () {
            if (!reduce && host.contains(this) && this.closest('[data-hand-instance-id="probe-2"]')) await decodeGate;
            return originalDecode.call(this);
          };
          const entry = (index) => ({
            cardId: "ST1-03",
            instanceId: `probe-${index}`,
            playableFromHand: false,
            projectedPlayCost: -1,
            activatableEffectsJson: "[]",
            digivolveTargetPermanentIds: [],
            linkTargetPermanentIds: [],
          });
          function render(count) {
            root.render(
              createElement(
                I18nProvider,
                null,
                createElement(Hand, { cards: Array.from({ length: count }, (_, i) => entry(i)), startDrag() {} }),
              ),
            );
          }
          try {
            render(2);
            await frame();
            await frame();
            await frame();
            if (host.querySelector(".game-hand-card--drawn"))
              throw new Error("An already populated hand replayed arrival on mount");
            render(3);
            await frame();
            await frame();
            await frame();
            const card = host.querySelector('[data-hand-instance-id="probe-2"]');
            if (!reduce) {
              const deadline = performance.now() + 120;
              while (performance.now() < deadline) {
                if (
                  !card.classList.contains("game-hand-card--arrival-pending") ||
                  getComputedStyle(card).visibility !== "hidden" ||
                  card.getAnimations().some((candidate) => candidate.animationName === "battle-hand-draw")
                )
                  throw new Error("A delayed image consumed the incoming card's animation before readiness");
                await frame();
              }
            }
            releaseDecode();
            const readinessDeadline = performance.now() + 3000;
            while (card.classList.contains("game-hand-card--arrival-pending")) {
              if (performance.now() > readinessDeadline) throw new Error("Delayed incoming artwork never became ready");
              await frame();
            }
            const animation = card.getAnimations().find((candidate) => candidate.animationName === "battle-hand-draw");
            if (!reduce && !animation) throw new Error("Decoded artwork did not start its own arrival clock");
            animation?.pause();
            const samples = [];
            for (const clock of reduce ? [0] : [0, 2, 8, 16, 25, 46.4082041, 64, 80, 120]) {
              if (animation) animation.currentTime = Math.min(clock, 80);
              const style = getComputedStyle(card);
              const height = parseFloat(style.height);
              const token = style.translate.split(" ")[1] || "0";
              samples.push({
                clock: animation?.currentTime,
                duration: animation?.effect.getComputedTiming().duration,
                normalizedY: token.endsWith("%") ? parseFloat(token) / 100 : parseFloat(token) / height,
                opacity: Number(style.opacity),
                faceWidth: parseFloat(getComputedStyle(card.firstElementChild).width),
                faceHeight: parseFloat(getComputedStyle(card.firstElementChild).height),
                transform: style.transform,
                overflow: document.documentElement.scrollWidth > innerWidth,
              });
            }
            render(3);
            await frame();
            await frame();
            if (
              host.querySelector('[data-hand-instance-id="probe-2"]') !== card ||
              card.getAnimations().find((candidate) => candidate.animationName === "battle-hand-draw") !== animation
            )
              throw new Error("A retained hand entry restarted its CSS clock on rerender");
            return samples;
          } finally {
            releaseDecode();
            HTMLImageElement.prototype.decode = originalDecode;
            root.unmount();
            host.remove();
          }
        }, reduced);
        if (
          probe.some(
            (sample) =>
              sample.opacity !== 1 ||
              sample.overflow ||
              sample.faceWidth !== probe[0].faceWidth ||
              sample.faceHeight !== probe[0].faceHeight ||
              sample.transform !== probe[0].transform,
          )
        )
          throw new Error(`${width}px: hand entry changed resting size, fan or opacity`);
        if (reduced) {
          if (probe.some((sample) => sample.clock !== undefined || sample.normalizedY !== 0))
            throw new Error(`${width}px: reduced component kept decorative motion`);
        } else {
          for (const sample of probe) verifyCurve(sample);
          if (Math.min(...probe.map((sample) => sample.normalizedY)) >= -0.049)
            throw new Error(`${width}px: exact overshoot was not exercised`);
        }
        if (errors.length) throw new Error(errors.join("\n"));
        results.push({ width, reduced, live, probe });
        await writeFile(
          new URL(`arrival-${width}${reduced ? "-reduced" : ""}.json`, output),
          JSON.stringify({ live, probe }, null, 2) + "\n",
        );
        console.log(
          `${width}px ${reduced ? "reduced" : "normal"}: natural hand arrival and controlled component passed`,
        );
      } finally {
        await page.close();
      }
    }
  }
  const references = [];
  for (const width of [320, 1440]) references.push(await verifyReference(width));
  references.push(await verifyReference(320, true));
  await writeFile(
    new URL(values["reference-only"] ? "reference-validation.json" : "capture.json", output),
    JSON.stringify(
      {
        note: "Normal Arena playback and separate sought-clock Hand probes. These verify rendering and geometry, not engine legality or primary camera projection.",
        results,
        references,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
