#!/usr/bin/env node
import { createRequire } from "node:module";
import { writeFile, mkdir } from "node:fs/promises";
import { parseArgs } from "node:util";
const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      // Reduced motion drains decorative queue entries. Exercise a retained source
      // directly through the production Hand, independently of that queue policy.
      await page.evaluate(async () => {
        const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
        const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
        const { Hand } = await import("/src/game/piece/Hand.tsx");
        const handModule = await (await fetch("/src/game/piece/Hand.tsx")).text();
        const i18nPath = handModule.match(/from "([^"]*\/i18n\/index\.tsx[^"]*)"/)?.[1];
        if (!i18nPath) throw new Error("Hand's actual provider import could not be resolved");
        const { I18nProvider } = await import(i18nPath);
        const host = document.createElement("div");
        Object.assign(host.style, { position: "fixed", top: "250px", left: "8px", width: "calc(100vw - 16px)" });
        document.body.append(host);
        const entry = {
          cardId: "ST1-03",
          instanceId: "reduced-source",
          playableFromHand: false,
          projectedPlayCost: -1,
          activatableEffectsJson: "[]",
          digivolveTargetPermanentIds: [],
          linkTargetPermanentIds: [],
        };
        window.aegisHandProbeRoot = createRoot(host);
        window.aegisHandProbeRoot.render(
          createElement(
            I18nProvider,
            null,
            createElement(Hand, {
              cards: [entry],
              startDrag() {},
              effectSource: {
                key: 700,
                seat: 0,
                cardId: "ST1-03",
                site: { zone: "hand", instanceId: "reduced-source" },
                linked: true,
              },
            }),
          ),
        );
      });
      await page
        .locator(".game-hand-card--effect-source")
        .waitFor({ timeout: 5000 })
        .catch(async (error) => {
          console.log(
            JSON.stringify({
              errors,
              state: await page.evaluate(() => ({
                reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
                hands: [...document.querySelectorAll(".game-hand-card")].map((element) => ({
                  cls: element.className,
                  id: element.dataset.handInstanceId,
                })),
                text: document.body.textContent.slice(-500),
              })),
            }),
          );
          throw error;
        });
      const reduced = await page.evaluate(() => {
        const source = document.querySelector(".game-hand-card--effect-source");
        return {
          portal: !!document.querySelector(".game-hand-source-focus"),
          visibility: getComputedStyle(source.firstElementChild).visibility,
          animations: source.getAnimations().length,
          outline: getComputedStyle(source).outlineStyle,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      if (
        reduced.portal ||
        reduced.visibility !== "visible" ||
        reduced.animations ||
        reduced.outline !== "solid" ||
        reduced.overflow
      )
        throw new Error(`${width}px: reduced-motion source lost its steady visible cue`);
      // Enable motion after preparation: a retained reading owner must start settled.
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.locator(".game-hand-source-focus__anchor--settled").waitFor();
      const resumed = await page.evaluate(() => {
        const focus = document.querySelector(".game-hand-source-focus");
        return { linked: focus.dataset.linked, animations: focus.getAnimations({ subtree: true }).length };
      });
      if (resumed.linked !== "true" || resumed.animations)
        throw new Error(`${width}px: resumed reading source replayed preparation`);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => !document.querySelector(".game-hand-source-focus"));
      await page.evaluate(() => window.aegisHandProbeRoot.unmount());
      if (errors.length) throw new Error(errors.join("; "));
      results.push({ width, reduced, resumed });
      console.log(`${width}px: reduced motion, settled resumption and portal release passed`);
    } finally {
      await page.close();
    }
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.effect-speed", "fast");
    });
    await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
    await page.getByRole("button", { name: "Demo tools", exact: true }).click();
    await page.getByRole("menuitem", { name: "Preview hand source: first card", exact: true }).click();
    await page.locator(".game-hand-source-focus").waitFor();
    await page.evaluate(async () => {
      const ownerModule = await (await fetch("/src/game/match/narration/narrationStream.ts")).text();
      const pacingPath = ownerModule.match(/from "([^"]*\/pacing\.ts[^"]*)"/)?.[1];
      if (!pacingPath) throw new Error("Narration's actual pacing import could not be resolved");
      const { setEffectSpeed, getEffectSpeed } = await import(pacingPath);
      setEffectSpeed("normal");
      if (getEffectSpeed() !== "normal") throw new Error("Live source speed setting did not change");
    });
    await page.waitForFunction(() => document.querySelector(".game-hand-source-focus")?.dataset.linked === "true");
    const source = page.locator('.game-hand-card[data-hand-instance-id="hand-0"]');
    await source.hover();
    await page.waitForFunction(() => {
      const focus = document.querySelector(".game-hand-source-focus__anchor");
      const slot = document.querySelector('.game-hand-card[data-hand-instance-id="hand-0"]');
      const angle = Number.parseFloat(focus.style.getPropertyValue("--hand-focus-angle"));
      const a = focus.getBoundingClientRect(),
        s = slot.getBoundingClientRect();
      return (
        slot.dataset.handHovered === "true" &&
        Math.abs(angle + 8) < 0.001 &&
        Math.abs(a.y + a.height / 2 - s.y - s.height / 2) < 0.025 &&
        !document.querySelector(".game-hand-hover")
      );
    });
    const hover = await page.evaluate(() => {
      const focus = document.querySelector(".game-hand-source-focus");
      const scale = focus.querySelector(".game-hand-source-focus__scale");
      const animation = scale.getAnimations().find((entry) => entry.animationName === "battle-hand-focus-scale");
      return {
        duration: animation.effect.getComputedTiming().duration,
        clock: animation.currentTime,
        linked: focus.dataset.linked,
      };
    });
    if (hover.duration !== 275 || hover.clock !== 275 || hover.linked !== "true")
      throw new Error("Hover or setting changes restarted the captured clock");
    await page.mouse.move(1000, 200);
    await page.waitForFunction(
      () =>
        Math.abs(
          Number.parseFloat(
            document.querySelector(".game-hand-source-focus__anchor").style.getPropertyValue("--hand-focus-angle"),
          ) + 8,
        ) < 0.001,
    );
    await page.waitForFunction(() => !document.querySelector(".game-hand-source-focus"), undefined, { timeout: 15000 });
    if (errors.length) throw new Error(errors.join("; "));
    results.push({ width: 1440, hover, midOccurrenceSpeedChange: true, naturalCleanup: true });
    console.log("1440px: hover tracking, captured speed and natural cleanup passed");
  } finally {
    await page.close();
  }
  const preparationPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await preparationPage.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.setItem("aegis.effect-speed", "normal");
    });
    await preparationPage.goto(new URL("/dev/arena?mode=visual", values.base).href);
    await preparationPage.getByRole("button", { name: "Demo tools", exact: true }).click();
    await preparationPage.getByRole("menuitem", { name: "Preview hand source: first card", exact: true }).click();
    await preparationPage.locator(".game-hand-source-focus").waitFor();
    const locked = await preparationPage.evaluate(() => {
      const slot = document.querySelector('.game-hand-card[data-hand-instance-id="hand-0"]');
      const before = getComputedStyle(slot).transform;
      const animation = document
        .querySelector(".game-hand-source-focus__scale")
        .getAnimations()
        .find((entry) => entry.animationName === "battle-hand-focus-scale");
      slot.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      return { before, clock: animation.currentTime };
    });
    await preparationPage.waitForTimeout(100);
    const after = await preparationPage.evaluate(
      () => getComputedStyle(document.querySelector('.game-hand-card[data-hand-instance-id="hand-0"]')).transform,
    );
    if (locked.clock >= 300 || after !== locked.before || (await preparationPage.locator(".game-hand-hover").count()))
      throw new Error("Hover was not frozen during painted preparation");
    await preparationPage.waitForFunction(() =>
      document
        .querySelector(".game-hand-source-focus__scale")
        .getAnimations()
        .some(
          (animation) => animation.animationName === "battle-hand-focus-scale" && animation.playState === "finished",
        ),
    );
    // A fresh pointer entry is accepted after the hold; the active source retains its own face.
    await preparationPage.mouse.move(1000, 200);
    await preparationPage.locator('.game-hand-card[data-hand-instance-id="hand-0"]').hover();
    await preparationPage.waitForFunction(
      () =>
        document.querySelector('.game-hand-card[data-hand-instance-id="hand-0"]')?.dataset.handHovered === "true" &&
        !document.querySelector(".game-hand-hover"),
    );
    results.push({
      width: 1440,
      preparationHoverLock: true,
      lockObservedAt: locked.clock,
      hoverReleasedAfterHold: true,
    });
    console.log("1440px: preparation hover lock and post-hold release passed");
  } finally {
    await preparationPage.close();
  }
  const output = new URL("../../.local/motion-reference/aegis-hand-sources/", import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL("lifecycle.json", output), JSON.stringify({ results }, null, 2));
} finally {
  await browser.close();
}
