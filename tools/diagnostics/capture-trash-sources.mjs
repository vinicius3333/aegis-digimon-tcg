#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, ".local/motion-reference/aegis-trash-sources");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 768, 1024, 1440]) {
    for (const seat of [0, 1]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
        await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate((owner) => {
          const prefix = owner === 0 ? ".game-utility-slot--you-trash" : ".game-utility-slot--opp-trash";
          const pile = document.querySelector(`${prefix} .game-pile`);
          const top = pile.querySelector(".game-pile__top");
          const countBadge = pile.querySelector(".game-pile__count");
          window.aegisTrashSourceCapture = {
            before: {
              pile: pile.getBoundingClientRect().toJSON(),
              top: top.getBoundingClientRect().toJSON(),
              badge: countBadge.getBoundingClientRect().toJSON(),
              topName: top.querySelector("img")?.alt,
              count: pile.parentElement.getAttribute("aria-label"),
            },
            samples: [],
            complete: false,
          };
          let source;
          let lastClock = 0;
          function sample() {
            source ??= pile.querySelector(".game-pile__effect-card");
            if (source && !source.isConnected) {
              window.aegisTrashSourceCapture.lastClock = lastClock;
              window.aegisTrashSourceCapture.complete = true;
              return;
            }
            if (source) {
              const animation = source
                .getAnimations()
                .find((entry) => entry.animationName === "battle-effect-trash-activation");
              const face = source.querySelector("img");
              lastClock = animation?.currentTime ?? lastClock;
              window.aegisTrashSourceCapture.samples.push({
                cardId: source.dataset.cardId,
                instanceId: source.dataset.instanceId,
                clock: lastClock,
                linked: source.dataset.linked === "true",
                duration: animation?.effect.getComputedTiming().duration,
                translation: getComputedStyle(source).transform,
                topTranslation: getComputedStyle(top).transform,
                pile: pile.getBoundingClientRect().toJSON(),
                top: top.getBoundingClientRect().toJSON(),
                badge: countBadge.getBoundingClientRect().toJSON(),
                badgeZ: Number(getComputedStyle(countBadge).zIndex),
                sourceZ: Number(getComputedStyle(source).zIndex),
                badgeText: countBadge.textContent.trim(),
                count: pile.parentElement.getAttribute("aria-label"),
                topName: top.querySelector("img")?.alt,
                sourceName: face?.alt,
                sourceDecoded: !!face?.complete && face.naturalWidth > 0,
                overflow: document.documentElement.scrollWidth > innerWidth,
              });
            }
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }, seat);
        await page.getByRole("button", { name: "Demo tools", exact: true }).click();
        await page
          .getByRole("menuitem", {
            name: `Preview trash source: ${seat === 0 ? "your buried card" : "opponent buried card"}`,
            exact: true,
          })
          .click();
        await page.waitForFunction(
          () => window.aegisTrashSourceCapture.samples.some((sample) => sample.sourceDecoded && sample.clock >= 500),
          undefined,
          { timeout: 10000 },
        );
        await page.screenshot({ path: path.join(output, `${width}-seat-${seat}-source.png`) });
        try {
          await page.waitForFunction(() => window.aegisTrashSourceCapture.complete, undefined, { timeout: 20000 });
        } catch (error) {
          const failure = await page.evaluate(() => ({
            ...window.aegisTrashSourceCapture,
            activeSources: [...document.querySelectorAll(".game-pile__effect-card")].map((card) => ({
              connected: card.isConnected,
              key: card.dataset.activationKey,
              linked: card.dataset.linked,
              animations: card.getAnimations().map((animation) => ({
                name: animation.animationName,
                time: animation.currentTime,
                state: animation.playState,
              })),
            })),
          }));
          await writeFile(
            path.join(output, `${width}-seat-${seat}-failure.json`),
            JSON.stringify({ errors, failure }, null, 2),
          );
          throw error;
        }
        const capture = await page.evaluate(() => window.aegisTrashSourceCapture);
        await writeFile(path.join(output, `${width}-seat-${seat}.json`), JSON.stringify(capture, null, 2) + "\n");
        if (capture.samples.length < 15 || capture.lastClock !== 830)
          throw new Error(`${width}px seat${seat}: source animation was missing or truncated`);
        for (const sample of capture.samples) {
          if (
            sample.cardId !== (seat === 0 ? "BT26-015" : "BT26-074") ||
            sample.instanceId !== `trash-${seat}-0` ||
            sample.sourceName === sample.topName
          )
            throw new Error(`${width}px seat${seat}: the wrong physical card activated`);
          if (
            sample.overflow ||
            sample.count !== capture.before.count ||
            sample.topName !== capture.before.topName ||
            sample.topTranslation !== "none" ||
            sample.duration !== 830
          )
            throw new Error(`${width}px seat${seat}: static trash or clock changed`);
          if (sample.badgeZ <= sample.sourceZ || sample.badgeText !== "2")
            throw new Error(`${width}px seat${seat}: the source covered the count badge`);
          for (const box of ["pile", "top", "badge"])
            for (const property of ["x", "y", "width", "height"])
              if (Math.abs(sample[box][property] - capture.before[box][property]) > 0.01)
                throw new Error(`${width}px seat${seat}: ${box} changed ${property}`);
        }
        // Reconstruct the authored 250 + 250 + 250 + 80ms sequence independently.
        const outQuad = (progress) => 1 - (1 - Math.min(1, Math.max(0, progress))) ** 2;
        for (const sample of capture.samples) {
          const t = sample.clock;
          const scale =
            t < 250
              ? 1 + 0.4 * outQuad(t / 250)
              : t < 500
                ? 1.4 + 0.6 * outQuad((t - 250) / 250)
                : t < 750
                  ? 2
                  : 2 - 0.6 * outQuad((t - 750) / 80);
          const matrix = sample.translation
            .match(/matrix\(([^)]+)\)/)?.[1]
            .split(",")
            .map(Number);
          const x = (seat === 0 ? -1 : 1) * 1.9 * capture.before.pile.width * outQuad(t / 250);
          const y = (seat === 0 ? -95 / 140 : 30 / 140) * capture.before.pile.height * outQuad(t / 250);
          if (
            !matrix ||
            Math.abs(matrix[0] - scale) > 0.00003 ||
            Math.abs(matrix[4] - x) > 0.002 ||
            Math.abs(matrix[5] - y) > 0.002
          )
            throw new Error(`${width}px seat${seat}: authored scale/move curve diverged at ${t}ms`);
        }
        if (!capture.samples.some((sample) => sample.clock >= 500 && sample.clock <= 750))
          throw new Error(`${width}px seat${seat}: enlarged hold was not painted`);
        if (!capture.samples.some((sample) => sample.linked && sample.clock >= 750 && sample.clock < 830))
          throw new Error(`${width}px seat${seat}: clause reading did not overlap the final shrink`);
        if (errors.length) throw new Error(errors.join("\n"));
        results.push({ width, seat, samples: capture.samples.length, lastClock: capture.lastClock });
        console.log(`${width}px seat${seat}: physical trash source, static pile and completed clock passed`);
      } finally {
        await page.close();
      }
    }
  }
  // Separate production queue/component probes cover standalone completion and speed settings.
  const standaloneProbes = [];
  for (const width of [320, 768, 1024, 1440]) {
    for (const speed of ["normal", "fast"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.addInitScript((setting) => localStorage.setItem("aegis.effect-speed", setting), speed);
        await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        await page.evaluate(async () => {
          const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const { Pile } = await import("/src/game/piece/Pile.tsx");
          const { enqueueEffectSources } = await import("/src/game/match/present/effectSources.ts");
          const { createAnimationQueue } = await import("/src/game/animationQueue.ts");
          const { trashEffectCardFromSources } = await import("/src/game/effectSource.ts");
          const host = document.createElement("div");
          host.dataset.testid = "standalone-trash-probe";
          Object.assign(host.style, { position: "fixed", right: "24px", bottom: "260px", zIndex: "1000" });
          document.body.append(host);
          const renderer = createRoot(host);
          const queue = createAnimationQueue();
          let sources = [];
          const trash = [{ cardId: "ST1-02", instanceId: "standalone-buried" }];
          function paint() {
            renderer.render(
              createElement(Pile, {
                count: 2,
                label: "Standalone trash",
                topCardId: "ST1-03",
                width: 62,
                className: "game-utility-slot--you-trash",
                effectCard: trashEffectCardFromSources(sources, 0, trash),
              }),
            );
          }
          paint();
          window.aegisStartStandaloneTrash = () => {
            const capture = (window.aegisStandaloneTrashCapture = { samples: [], complete: false });
            let source;
            function sample() {
              source ??= host.querySelector(".game-pile__effect-card");
              if (source && !source.isConnected) {
                capture.complete = true;
                capture.queueIdle = queue.isIdle();
                return;
              }
              if (source) {
                const animation = source
                  .getAnimations()
                  .find((entry) => entry.animationName === "battle-effect-trash-activation");
                capture.samples.push({
                  clock: animation?.currentTime,
                  duration: animation?.effect.getComputedTiming().duration,
                  state: animation?.playState,
                  cardId: source.dataset.cardId,
                  instanceId: source.dataset.instanceId,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                });
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
            enqueueEffectSources({
              fresh: [
                {
                  kind: "effectActivated",
                  seat: 0,
                  sourceCardId: "ST1-02",
                  effectKey: "standalone",
                  description: "Standalone source probe.",
                },
              ],
              usedOption: undefined,
              combatLeadInMs: 0,
              cardSiteRef: { current: { locate: () => ({ zone: "trash", instanceId: "standalone-buried" }) } },
              effectSourceKeyRef: { current: 0 },
              enqueue: queue.enqueue,
              setEffectSources(update) {
                sources = typeof update === "function" ? update(sources) : update;
                paint();
              },
            });
          };
        });
        await page.getByRole("img", { name: "Standalone trash · 2", exact: true }).waitFor();
        await page.evaluate(() => window.aegisStartStandaloneTrash());
        await page.waitForFunction(() => window.aegisStandaloneTrashCapture?.complete, undefined, { timeout: 10000 });
        const capture = await page.evaluate(() => window.aegisStandaloneTrashCapture);
        const duration = speed === "normal" ? 830 : 456.5;
        await writeFile(path.join(output, `${width}-standalone-${speed}.json`), JSON.stringify(capture, null, 2));
        if (
          capture.samples.length < 15 ||
          !capture.queueIdle ||
          !capture.samples.some(
            (sample) => Math.abs(sample.clock - duration) < 0.00001 && sample.state === "finished",
          ) ||
          capture.samples.some(
            (sample) =>
              Math.abs(sample.duration - duration) > 0.00001 ||
              sample.overflow ||
              sample.cardId !== "ST1-02" ||
              sample.instanceId !== "standalone-buried",
          ) ||
          errors.length
        )
          throw new Error(
            `${width}px ${speed}: standalone source clock/identity/overflow failed: ${errors.join("; ")}`,
          );
        standaloneProbes.push({
          width,
          speed,
          samples: capture.samples.length,
          lastClock: capture.samples.at(-1).clock,
        });
        console.log(`${width}px ${speed}: standalone painted completion and speed passed`);
      } finally {
        await page.close();
      }
    }
  }
  // Reduced-motion component probes are separate from the accepted-event captures:
  // the real cue queue may drain these transient activations without painting them.
  const reducedProbes = [];
  for (const width of [320, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    try {
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      await page.evaluate(async () => {
        const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
        const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
        const { Pile } = await import("/src/game/piece/Pile.tsx");
        const host = document.createElement("div");
        host.dataset.testid = "trash-source-reduced-probe";
        Object.assign(host.style, { position: "fixed", left: "100px", top: "260px", zIndex: "1000" });
        document.body.append(host);
        createRoot(host).render(
          createElement(Pile, {
            className: "game-pile--effect-source",
            count: 2,
            label: "Trash",
            topCardId: "ST1-03",
            width: 62,
            effectCard: { key: 1, cardId: "ST1-02", instanceId: "buried-probe" },
          }),
        );
      });
      await page.locator('[data-testid="trash-source-reduced-probe"] .game-pile__effect-card').waitFor();
      const probe = await page.evaluate(() => {
        const probeHost = document.querySelector('[data-testid="trash-source-reduced-probe"]');
        const source = probeHost.querySelector(".game-pile__effect-card");
        const top = probeHost.querySelector(".game-pile__top");
        const badge = probeHost.querySelector(".game-pile__count");
        return {
          animations: source.getAnimations().length,
          sourceTransform: getComputedStyle(source).transform,
          topTransform: getComputedStyle(top).transform,
          sourceCard: source.dataset.cardId,
          sourceInstance: source.dataset.instanceId,
          topName: top.querySelector("img")?.alt,
          count: badge.textContent.trim(),
          badgeZ: Number(getComputedStyle(badge).zIndex),
          sourceZ: Number(getComputedStyle(source).zIndex),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      if (
        probe.animations ||
        probe.sourceTransform !== "none" ||
        probe.topTransform !== "none" ||
        probe.sourceCard !== "ST1-02" ||
        probe.sourceInstance !== "buried-probe" ||
        probe.topName !== "Agumon" ||
        probe.count !== "2" ||
        probe.badgeZ <= probe.sourceZ ||
        probe.overflow
      )
        throw new Error(`${width}px: reduced source identity, motion or count stacking failed`);
      reducedProbes.push({ width, ...probe });
      console.log(`${width}px: reduced-motion production Pile identity and count passed`);
    } finally {
      await page.close();
    }
  }
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        results,
        reducedProbes,
        standaloneProbes,
        note: "Normal-clock development events through the real Arena renderer; separate standalone production component/queue Normal/Fast probes and isolated reduced-motion production Pile probes. This verifies physical source identity, normalized authored move/scale curves, the 830ms visual clock and its handoff to clause reading, with fixed pile geometry. Field-light rendering, video camera projection and printed-card legality are outside this probe.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
