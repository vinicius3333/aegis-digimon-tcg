#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";
import { captureCombatLayout } from "./combat-layout-probes.mjs";
import { captureCombatHandoff } from "./combat-handoff-probes.mjs";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    "no-video": { type: "boolean", default: false },
  },
});
const root = fileURLToPath(new URL("../../", import.meta.url));
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    const id = `aegis-combat-impacts-${viewport.name}${values["no-video"] ? "-probe" : ""}`;
    const output = path.join(root, ".local/motion-reference", id);
    await mkdir(output, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ...(values["no-video"]
        ? {}
        : { recordVideo: { dir: output, size: { width: viewport.width, height: viewport.height } } }),
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page.getByRole("menuitem", { name: "Automatically preview keywords", exact: true }).click();
      await page.getByRole("button", { name: "Pause after this scene", exact: true }).click();
      await page.getByRole("button", { name: /1\/44 · Blocker/ }).click();
      const select = page.getByRole("combobox", { name: "Choose a keyword" });
      const measurements = [];
      for (const scene of [
        { keyword: "Rush", claws: 1, attacker: "you-chronomon" },
        { keyword: "Retaliation", claws: 2, attacker: "opponent-plutomon" },
        { keyword: "Jamming", claws: 1 },
        { keyword: "Security attacker loses", claws: 1, menu: "Security battle: your Digimon loses" },
        { keyword: "Restored security battle", claws: 1, menu: "Security battle after effect" },
      ]) {
        if (scene.menu) {
          await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
          await page.evaluate(() => document.fonts.ready);
          await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        }
        // Observe normal playback through the actual renderer, including the
        // security delay. Do not seek, pause, or change any animation clock.
        await page.evaluate((expectedClaws) => {
          const capture = (window.aegisImpactCapture = { impacts: [], fieldPoses: [], complete: false });
          const observed = new Map();
          function readCardPose(card) {
            const style = getComputedStyle(card);
            const bounds = card.getBoundingClientRect();
            const translation = style.translate.split(" ");
            const animations = card.getAnimations();
            const translateWriters = animations.filter((animation) =>
              animation.effect.getKeyframes().some((frame) => typeof frame.translate === "string"),
            );
            const layoutFlight =
              translateWriters.length === 1 &&
              translateWriters.every((animation) => {
                const frames = animation.effect.getKeyframes();
                const timing = animation.effect.getTiming();
                return (
                  animation.constructor.name === "Animation" &&
                  card.hasAttribute("data-field-key") &&
                  animation.effect.target === card &&
                  animation.effect.composite === "replace" &&
                  frames.length === 2 &&
                  frames.every((frame) => typeof frame.translate === "string" && typeof frame.rotate === "string") &&
                  frames[1].translate.split(" ").every((token) => parseFloat(token) === 0) &&
                  frames[1].rotate === "0deg" &&
                  timing.duration === 420 &&
                  timing.delay === 0 &&
                  timing.iterations === 1 &&
                  timing.fill === "both" &&
                  timing.easing === "cubic-bezier(0.2, 0.8, 0.2, 1)"
                );
              });
            return {
              card: card.querySelector("img")?.getAttribute("alt"),
              ghost: card.matches(".game-field-clash-ghost"),
              struck: card.hasAttribute("data-combat-impact"),
              x: bounds.x,
              y: bounds.y,
              translate: style.translate,
              // Existing grouped-row FLIP settles into a changed slot in
              // either axis. Recognize its actual production keyframes.
              layoutFlight,
              unexpectedTranslation: translateWriters.length > 0 && !layoutFlight,
              translateX: translation[0] === "none" ? 0 : parseFloat(translation[0]),
              translateY: translation.length < 2 ? 0 : parseFloat(translation[1]),
              animations: animations.map((animation) => animation.animationName),
              layoutAnimations: animations
                .filter((animation) => !animation.animationName)
                .map((animation) => ({
                  type: animation.constructor.name,
                  frames: animation.effect.getKeyframes(),
                  timing: animation.effect.getTiming(),
                })),
            };
          }
          window.aegisReadAttackCardPose = readCardPose;
          function sample(now) {
            const arrow = document.querySelector(".game-attack-arrow--tracking");
            const claws = document.querySelectorAll(".game-claw").length;
            if (arrow || claws) {
              capture.fieldPoses.push({
                pageTimeMs: now,
                arrow: !!arrow,
                stage: document.querySelector("[data-demo-stage]")?.dataset.demoStage,
                arrows: [...document.querySelectorAll(".game-attack-arrow--tracking")].map((svg) => {
                  const shaft = svg.querySelector(".game-attack-arrow__reveal");
                  const animation = shaft?.getAnimations()[0];
                  return {
                    key: svg.dataset.attackKey,
                    source: svg.dataset.attackSource,
                    scale: shaft ? new DOMMatrix(getComputedStyle(shaft).transform).a : null,
                    clockMs: animation?.currentTime,
                    delayMs: animation?.effect.getTiming().delay,
                  };
                }),
                claws,
                cards: [...document.querySelectorAll(".game-permanent, .game-field-clash-ghost")].map(readCardPose),
              });
            }
            for (const svg of document.querySelectorAll(".game-claw svg")) {
              if (!observed.has(svg)) {
                const figure = svg.closest(".battle-clash__card");
                const field = svg.closest("[data-combat-impact]");
                const art = figure
                  ? figure.querySelector(".battle-clash__art")
                  : field?.matches(".game-field-clash-ghost")
                    ? [...field.children].find((child) => !child.matches(".game-claw"))
                    : field?.querySelector(".game-card-enter > [data-state]");
                const impact = {
                  onsetMs: now,
                  fate: figure?.dataset.fate,
                  role: figure?.dataset.role,
                  restored: figure?.closest(".battle-clash")?.dataset.revealedReady === "true",
                  kind: figure ? "security" : field?.matches(".game-field-clash-ghost") ? "ghost" : "field",
                  samples: [],
                  detachedAtMs: null,
                };
                observed.set(svg, { impact, art });
                capture.impacts.push(impact);
              }
            }
            for (const [svg, { impact, art }] of observed) {
              if (impact.detachedAtMs !== null) continue;
              if (!svg.isConnected) {
                impact.detachedAtMs = now - impact.onsetMs;
                continue;
              }
              const style = getComputedStyle(svg);
              const matrix = new DOMMatrix(style.transform);
              const animation = svg.getAnimations()[0];
              const timing = animation?.effect.getComputedTiming();
              const artStyle = art && getComputedStyle(art);
              const artAnimation = art
                ?.getAnimations()
                .find((candidate) => candidate.animationName === "battle-card-impact");
              const artTiming = artAnimation?.effect.getComputedTiming();
              const artWidth = artStyle && parseFloat(artStyle.width);
              const artHeight = artStyle && parseFloat(artStyle.height);
              const translation = (artStyle?.translate || "none").split(" ");
              function displacement(token, length) {
                if (!token || token === "none") return 0;
                return parseFloat(token) * (token.endsWith("%") ? length / 100 : 1);
              }
              const clawBounds = svg.parentElement.getBoundingClientRect();
              impact.samples.push({
                pageTimeMs: now,
                elapsedMs: now - impact.onsetMs,
                clockMs: animation?.currentTime,
                delayMs: timing?.delay,
                durationMs: timing?.duration,
                endMs: timing?.endTime,
                x: matrix.e / parseFloat(style.width),
                y: matrix.f / parseFloat(style.height),
                opacity: Number(style.opacity),
                clipping: getComputedStyle(svg.parentElement).overflow,
                tines: svg.querySelectorAll(".game-claw__tine").length,
                independentTineAnimations: [...svg.children].some((tine) => tine.getAnimations().length > 0),
                artWidth,
                artHeight,
                artX: displacement(translation[0], artWidth) / artWidth,
                artY: displacement(translation[1], artHeight) / artHeight,
                artClockMs: artAnimation?.currentTime,
                artDelayMs: artTiming?.delay,
                artDurationMs: artTiming?.duration,
                artEndMs: artTiming?.endTime,
                clawX: clawBounds.x,
                clawY: clawBounds.y,
                clawTranslation: getComputedStyle(svg.parentElement).translate,
                clawClocks: svg.parentElement.getAnimations().map((entry) => ({
                  clock: entry.currentTime,
                  start: entry.startTime,
                  frames: entry.effect.getKeyframes(),
                })),
                overflow: document.documentElement.scrollWidth - innerWidth,
              });
            }
            capture.complete =
              capture.impacts.length >= expectedClaws &&
              capture.impacts.every((impact) => impact.detachedAtMs !== null);
            if (!capture.complete) requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }, scene.claws);
        if (scene.menu) {
          await page.getByRole("button", { name: "Demo tools", exact: true }).click();
          await page.getByRole("menuitem", { name: scene.menu, exact: true }).click();
        } else {
          const value = await select.locator("option").filter({ hasText: scene.keyword }).getAttribute("value");
          await select.selectOption(value);
        }
        await page.waitForFunction(() => window.aegisImpactCapture.complete, undefined, { timeout: 15000 });
        // Commit the cleared board to the recorder, whose sampling clock is
        // independent of the rAF that observed the last component detach.
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))),
            ),
        );
        const capture = await page.evaluate(() => window.aegisImpactCapture);
        await writeFile(path.join(output, `${scene.keyword}.json`), JSON.stringify(capture, null, 2) + "\n");
        if (capture.fieldPoses.length < 15 || capture.fieldPoses.some((pose) => pose.cards.length === 0))
          throw new Error(`${scene.keyword}: insufficient live field position observations`);
        if (
          capture.fieldPoses.some((pose) =>
            pose.cards.some(
              (card) =>
                card.unexpectedTranslation ||
                (!card.layoutFlight && (Math.abs(card.translateX) > 0.001 || Math.abs(card.translateY) > 0.001)) ||
                card.animations.some((name) => /lunge/.test(name)),
            ),
          )
        )
          throw new Error(`${scene.keyword}: field wrapper received an automatic position impulse`);
        const remaining = await page.evaluate(() => ({
          claws: document.querySelectorAll(".game-claw").length,
          battles: document.querySelectorAll('.battle-clash[data-resolution="battle"]').length,
        }));
        if (remaining.claws || remaining.battles)
          throw new Error(`${scene.keyword}: impact left an owned stage after clearing`);
        if (scene.attacker) {
          const arrows = capture.fieldPoses
            .flatMap((pose) => pose.arrows)
            .filter((arrow) => arrow.source === scene.attacker);
          const keys = new Set(arrows.map((arrow) => arrow.key));
          const impactArrows = capture.fieldPoses
            .filter((pose) => pose.claws)
            .flatMap((pose) => pose.arrows)
            .filter((arrow) => arrow.source === scene.attacker);
          if (
            keys.size !== 1 ||
            ![...keys][0]?.startsWith("attack:") ||
            impactArrows.length < 10 ||
            impactArrows.some((arrow) => Math.abs(arrow.scale - 1) > 0.001)
          )
            throw new Error(`${scene.keyword}: declaration arrow restarted or remained incomplete at impact`);
        }
        for (const impact of capture.impacts) {
          const active = impact.samples.filter((sample) => sample.clockMs >= sample.delayMs);
          if (active.length < 15) throw new Error(`${scene.keyword}: insufficient impact samples`);
          for (const sample of impact.samples) {
            const age = Math.max(0, sample.clockMs - sample.delayMs);
            const expected = -1 + Math.min(1, age / 250) ** 3;
            if (Math.abs(sample.x - expected) > 0.015 || Math.abs(sample.y - expected) > 0.015)
              throw new Error(`${scene.keyword}: diagonal cubic trajectory differs at ${age} ms`);
            if (sample.tines !== 3 || sample.independentTineAnimations || sample.clipping !== "hidden")
              throw new Error(`${scene.keyword}: paths lost shared clock or card clipping`);
          }
          // A finished CSSAnimation clamps currentTime to its end. Continued
          // page samples, rather than a clock beyond that end, prove the hold.
          const holds = active.filter((sample) => sample.clockMs - sample.delayMs >= sample.durationMs);
          if (holds.length < 3 || holds.some((sample) => sample.x !== 0 || sample.y !== 0 || sample.opacity !== 1))
            throw new Error(`${scene.keyword}: missing completed visible settle`);
          if (holds.at(-1).pageTimeMs - holds[0].pageTimeMs < 30 || impact.detachedAtMs - holds[0].elapsedMs < 50)
            throw new Error(`${scene.keyword}: completed impact was removed before its visible hold`);
          if (impact.detachedAtMs + 20 < active[0].endMs)
            throw new Error(`${scene.keyword}: impact detached before its CSS clock completed`);
          if (impact.fate && impact.fate !== "beaten")
            throw new Error(`${scene.keyword}: surviving security card received a claw`);
          const shaken = active.filter((sample) => sample.artClockMs >= sample.artDelayMs);
          if (shaken.length < 15 || shaken.some((sample) => sample.artDurationMs !== 250))
            throw new Error(`${scene.keyword}: missing independently painted 250 ms card tremor`);
          // Independently reconstruct the source's seven weighted durations,
          // decaying magnitude and valid planar direction changes. Randomness
          // is fixed in Aegis for reproducibility, not sampled from this recorder.
          const angles = [150, -45, 190, -20, 120, -65];
          const poses = [[0, 0]];
          const offsets = [0];
          for (let index = 0; index < 7; index++) {
            offsets.push(((index + 1) * (index + 2)) / 56);
            const magnitude = 1 - index / 7;
            const angle = (angles[index] * Math.PI) / 180;
            poses.push(index === 6 ? [0, 0] : [Math.cos(angle) * magnitude, Math.sin(angle) * magnitude]);
          }
          const centralReveal = impact.kind === "security" && impact.role === "revealed";
          const strengthX = centralReveal ? 8 / 60 : 8 / 90;
          const strengthY = centralReveal ? 8 / 84 : 8 / 126;
          for (const sample of shaken) {
            const progress = Math.min(1, (sample.artClockMs - sample.artDelayMs) / 250);
            const segment = Math.max(
              1,
              offsets.findIndex((offset) => offset >= progress),
            );
            const local = (progress - offsets[segment - 1]) / (offsets[segment] - offsets[segment - 1]);
            const eased = 1 - (1 - local) ** 2;
            const expected = poses[segment - 1].map((start, axis) => start + (poses[segment][axis] - start) * eased);
            if (
              Math.abs(sample.artX - expected[0] * strengthX) > 0.0005 ||
              Math.abs(sample.artY - expected[1] * strengthY) > 0.0005
            )
              throw new Error(`${scene.keyword}: decaying card tremor differs at ${progress * 250} ms`);
            if (Math.abs(sample.clawX - shaken[0].clawX) > 0.5 || Math.abs(sample.clawY - shaken[0].clawY) > 0.5)
              throw new Error(`${scene.keyword}: claw anchor moved with the struck artwork`);
            if (sample.overflow > 1) throw new Error(`${scene.keyword}: impact added horizontal page overflow`);
          }
          const settled = shaken.filter((sample) => sample.artClockMs - sample.artDelayMs >= 250);
          if (settled.length < 3 || settled.some((sample) => sample.artX !== 0 || sample.artY !== 0))
            throw new Error(`${scene.keyword}: card did not return to its resting geometry`);
          if (Math.abs(shaken[0].artClockMs - shaken[0].artDelayMs - (shaken[0].clockMs - shaken[0].delayMs)) > 1)
            throw new Error(`${scene.keyword}: claw and struck card started on different clocks`);
        }
        measurements.push({ ...scene, ...capture });
        if (!scene.menu) await page.locator(".arena-visual-player__summary").click();
      }
      // An isolated adversarial observation, after all normal-clock cases:
      // a known layout flight must not conceal a second root translate writer.
      const translationGuardProbe = await page.evaluate(() => {
        const source = document.querySelector(".game-permanent[data-field-key]");
        if (!source) throw new Error("No production field frame for translation guard probe");
        const fixture = source.cloneNode(true);
        Object.assign(fixture.style, { position: "fixed", visibility: "hidden", pointerEvents: "none" });
        document.body.append(fixture);
        const animations = [];
        try {
          const flight = fixture.animate(
            [
              { translate: "10px 8px", rotate: "0deg" },
              { translate: "0px 0px", rotate: "0deg" },
            ],
            { duration: 420, fill: "both", easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
          );
          animations.push(flight);
          flight.pause();
          flight.currentTime = 210;
          const legal = window.aegisReadAttackCardPose(fixture);
          if (!legal.layoutFlight || legal.unexpectedTranslation)
            throw new Error("Translation guard rejected the isolated production layout recipe");
          const intruder = fixture.animate([{ translate: "0px -14px" }, { translate: "0px -14px" }], {
            duration: 1000,
            fill: "both",
          });
          animations.push(intruder);
          intruder.pause();
          intruder.currentTime = 200;
          const simultaneous = window.aegisReadAttackCardPose(fixture);
          if (simultaneous.layoutFlight || !simultaneous.unexpectedTranslation || simultaneous.translateY !== -14)
            throw new Error("Translation guard allowed another impulse alongside a known layout flight");
          return { legal, simultaneous, note: "Isolated sought-clock guard probe, excluded from live Arena cases." };
        } finally {
          for (const animation of animations) animation.cancel();
          fixture.remove();
        }
      });
      if (errors.length) throw new Error(errors.join("\n"));
      const video = page.video();
      await context.close();
      const input = path.join(output, "reference.webm");
      if (video) await video.saveAs(input);
      await writeFile(
        path.join(output, "capture.json"),
        JSON.stringify(
          {
            viewport,
            measurements,
            translationGuardProbe,
            note: "Recorder and page clocks are independent. Scripted visual fixtures verify rendering, not engine legality or full source fidelity.",
          },
          null,
          2,
        ) + "\n",
      );
      if (values["no-video"]) {
        console.log(`${viewport.name}: five live impact cases passed without recording`);
        continue;
      }
      await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            path.join(root, "tools/diagnostics/prepare-motion-reference.mjs"),
            "--input",
            input,
            "--id",
            id,
            "--title",
            `Aegis · impactos de combate · ${viewport.name}`,
          ],
          { stdio: "inherit" },
        );
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
      });
      console.log(`Compare /dev/motion-reference?comparison=${id}`);
    } finally {
      await context.close();
    }
  }
  await captureCombatLayout({
    browser,
    base: values.base,
    output: path.join(root, ".local/motion-reference/aegis-combat-layout"),
  });
  await captureCombatHandoff({
    browser,
    base: values.base,
    output: path.join(root, ".local/motion-reference/aegis-combat-handoff"),
  });
} finally {
  await browser.close();
}
