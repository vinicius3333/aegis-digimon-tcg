#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-hand-hover/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const summary = [];
async function arena(width, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, ...options });
  page.aegisErrors = [];
  page.on("pageerror", (error) => page.aegisErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll('[data-testid="hand"] img')].map((img) => img.decode().catch(() => {})),
    );
  });
  return page;
}
async function visiblePoint(slot) {
  return await slot.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    for (const yRatio of [0.2, 0.45, 0.7, 0.9])
      for (const xRatio of [0.08, 0.16, 0.25, 0.4, 0.6, 0.8, 0.92]) {
        const x = rect.x + rect.width * xRatio,
          y = rect.y + rect.height * yRatio;
        if (document.elementFromPoint(x, y)?.closest("[data-hand-instance-id]") === node) return { x, y };
      }
    throw new Error("The physical fan card has no visible pointer target");
  });
}
async function enter(page, position) {
  const physicalSlot = page.locator('[data-testid="hand"] > .game-hand-card')[position]();
  await physicalSlot.scrollIntoViewIfNeeded();
  const baseline = await physicalSlot.evaluate((node) => {
    const face = node.firstElementChild;
    const matrix = new DOMMatrix(getComputedStyle(node).transform);
    const angle = Math.atan2(matrix.b, matrix.a),
      c = Math.abs(Math.cos(angle)),
      s = Math.abs(Math.sin(angle));
    const f = face.getBoundingClientRect(),
      r = node.getBoundingClientRect();
    return {
      id: node.dataset.handInstanceId,
      rect: r.toJSON(),
      width: (f.width * c - f.height * s) / (c * c - s * s),
      height: (f.height * c - f.width * s) / (c * c - s * s),
      opacity: getComputedStyle(face).opacity,
      visibility: getComputedStyle(face).visibility,
      src: face.querySelector("img")?.currentSrc,
      selected: node.getAttribute("aria-pressed"),
      order: [...node.parentElement.children].map((child) => child.dataset.handInstanceId),
    };
  });
  const point = await visiblePoint(physicalSlot);
  await page.mouse.move(point.x, point.y);
  await page.locator(`[data-hand-hover-instance-id="${baseline.id}"]`).waitFor({ state: "visible" });
  await page.waitForFunction(
    (id) =>
      document.querySelector(`.game-hand-card[data-hand-instance-id="${id}"]`)?.dataset.handHoverCovered === "true",
    baseline.id,
  );
  const measured = await page.evaluate((id) => {
    const copy = document.querySelector(`[data-hand-hover-instance-id="${id}"]`),
      slot = document.querySelector(`.game-hand-card[data-hand-instance-id="${id}"]`);
    const r = copy.getBoundingClientRect(),
      original = slot.firstElementChild,
      image = copy.querySelector("img");
    return {
      rect: r.toJSON(),
      originalOpacity: getComputedStyle(original).opacity,
      originalVisibility: getComputedStyle(original).visibility,
      originalTransition: getComputedStyle(original).transitionDuration,
      src: image?.currentSrc,
      decoded: !image || (image.complete && image.naturalWidth > 0),
      order: [...slot.parentElement.children].map((child) => child.dataset.handInstanceId),
      selected: slot.getAttribute("aria-pressed"),
      slot: slot.getBoundingClientRect().toJSON(),
      overflow: document.documentElement.scrollWidth > innerWidth,
      hoverTransforms: copy.getAnimations().filter((a) => a.transitionProperty === "transform").length,
    };
  }, baseline.id);
  if (
    page.aegisErrors.length ||
    !measured.decoded ||
    measured.originalOpacity !== "1" ||
    measured.originalVisibility !== "hidden" ||
    measured.src !== baseline.src ||
    measured.overflow ||
    JSON.stringify(measured.order) !== JSON.stringify(baseline.order) ||
    measured.selected !== baseline.selected
  )
    throw new Error(`${page.viewportSize().width}px ${position}: hover doubled/changed the physical face or order`);
  for (const key of ["x", "y", "width", "height"])
    if (Math.abs(measured.slot[key] - baseline.rect[key]) > 0.1) throw new Error("Hover moved its physical slot");
  const centerY = measured.rect.y + measured.rect.height / 2,
    restY = baseline.rect.y + baseline.rect.height / 2;
  if (
    Math.abs(measured.rect.width / baseline.width - 1.2) > 0.002 ||
    Math.abs(measured.rect.height / baseline.height - 1.2) > 0.002 ||
    Math.abs((centerY - restY) / baseline.height + 0.504) > 0.002 ||
    measured.hoverTransforms ||
    measured.rect.left < 7.9 ||
    measured.rect.right > page.viewportSize().width - 7.9
  )
    throw new Error("Hover differs from measured 1.2 scale/fixed-anchor lift");
  // The newly visible upper face must remain a real pointer target outside the strip.
  await page.mouse.move(measured.rect.x + measured.rect.width / 2, measured.rect.y + measured.rect.height * 0.15);
  await page.waitForTimeout(100);
  if ((await page.locator(`[data-hand-hover-instance-id="${baseline.id}"]`).count()) !== 1)
    throw new Error("Moving onto the enlarged face lost hover");
  return { baseline, measured };
}
async function leave(page, instanceId) {
  await page.evaluate((id) => {
    const rows = [];
    window.aegisHoverRelease = { rows, started: performance.now() };
    const start = performance.now();
    function tick() {
      const node = document.querySelector(`.game-hand-card[data-hand-instance-id="${id}"]`),
        face = node.firstElementChild;
      rows.push({
        ms: performance.now() - start,
        hover: !!document.querySelector(".game-hand-hover"),
        opacity: getComputedStyle(face).opacity,
        visibility: getComputedStyle(face).visibility,
        rect: node.getBoundingClientRect().toJSON(),
        transformTransitions: node.getAnimations().filter((a) => a.transitionProperty === "transform").length,
      });
      if (performance.now() - start < 160) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, instanceId);
  await page.mouse.move(16, 16);
  await page.waitForTimeout(200);
  const rows = await page.evaluate(() => window.aegisHoverRelease.rows);
  await writeFile(new URL("last-release.json", output), JSON.stringify(rows, null, 2));
  const after = rows.filter((row) => !row.hover);
  if (
    after.length < 3 ||
    after[0].ms > 60 ||
    after.some((row) => row.opacity !== "1" || row.visibility !== "visible" || row.transformTransitions)
  )
    throw new Error("Pointer release faded or interpolated the resting face");
  return rows;
}
try {
  for (const width of [320, 768, 1024, 1440])
    for (const position of ["first", "last"]) {
      const page = await arena(width);
      try {
        const result = await enter(page, position);
        if (position === "first" && [320, 1440].includes(width))
          await page.screenshot({ path: new URL(`hover-${width}.png`, output).pathname });
        result.release = await leave(page, result.baseline.id);
        await writeFile(new URL(`${width}-${position}.json`, output), JSON.stringify(result, null, 2));
        summary.push({ width, position, natural: true });
        console.log(`${width}px ${position}: measured hover, upper-face hit target and natural return passed`);
      } finally {
        await page.close();
      }
    }
  for (const width of [320, 1440]) {
    const page = await arena(width);
    try {
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page.getByRole("menuitem", { name: "Select cards from hand", exact: true }).click();
      const result = await enter(page, "first");
      const face = page.locator(`[data-hand-hover-instance-id="${result.baseline.id}"]`);
      await face.click();
      const slot = page.locator(`.game-hand-card[data-hand-instance-id="${result.baseline.id}"]`);
      await page.waitForFunction(
        (id) =>
          document.querySelector(`.game-hand-card[data-hand-instance-id="${id}"]`)?.getAttribute("aria-pressed") ===
          "true",
        result.baseline.id,
      );
      const selected = await slot.getAttribute("aria-pressed");
      await page.mouse.move(16, 16);
      if (selected !== "true" || (await slot.getAttribute("aria-pressed")) !== "true")
        throw new Error("Hover pick toggled twice or release deselected it");
      summary.push({ width, selection: true });
      console.log(`${width}px: enlarged-face selection stays selected after pointer release`);
    } finally {
      await page.close();
    }
  }
  for (const width of [320, 1440]) {
    const page = await arena(width, { reducedMotion: "reduce" });
    try {
      const slot = page.locator('[data-testid="hand"] > .game-hand-card').first();
      const point = await visiblePoint(slot);
      await page.mouse.move(point.x, point.y);
      if (
        (await page.locator(".game-hand-hover").count()) ||
        (await slot.evaluate((node) => getComputedStyle(node.firstElementChild).opacity)) !== "1"
      )
        throw new Error("Reduced motion hid or enlarged the resting face");
      summary.push({ width, reducedMotion: true });
    } finally {
      await page.close();
    }
  }
  for (const width of [320, 1440]) {
    const page = await arena(width, { hasTouch: true });
    try {
      const slot = page.locator('[data-testid="hand"] > .game-hand-card').first();
      const point = await visiblePoint(slot);
      await page.touchscreen.tap(point.x, point.y);
      if (await page.locator(".game-hand-hover").count()) throw new Error("Touch synthesized a retained pointer hover");
      summary.push({ width, touch: true });
    } finally {
      await page.close();
    }
  }
  for (const width of [320, 1440]) {
    const page = await arena(width);
    try {
      await page.evaluate(async () => {
        const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
        const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
        const { Hand } = await import("/src/game/piece/Hand.tsx");
        const { useDragPlumbing } = await import("/src/game/screen/hooks/useDragPlumbing.ts");
        const handModule = await (await fetch("/src/game/piece/Hand.tsx")).text();
        const providerPath = handModule.match(/from "([^"]*\/i18n\/index\.tsx[^"]*)"/)?.[1];
        if (!providerPath) throw new Error("The production Hand provider could not be resolved");
        const { I18nProvider } = await import(providerPath);
        const host = document.createElement("div");
        Object.assign(host.style, { position: "fixed", top: "300px", left: "8px", width: "calc(100vw - 16px)" });
        document.body.append(host);
        const entry = {
          instanceId: "hover-drag",
          cardId: "ST1-03",
          playableFromHand: true,
          projectedPlayCost: 2,
          activatableEffectsJson: "[]",
          digivolveTargetPermanentIds: [],
          linkTargetPermanentIds: [],
        };
        window.aegisHoverDrag = { taps: 0, drops: [] };
        function DragProbe() {
          const plumbing = useDragPlumbing();
          plumbing.canDragRef.current = () => true;
          plumbing.handleTapRef.current = () => window.aegisHoverDrag.taps++;
          plumbing.handleDropRef.current = (drag) =>
            window.aegisHoverDrag.drops.push({
              id: drag.instanceId,
              capture: drag.capture?.dataset.handInstanceId,
              connected: drag.capture?.isConnected,
            });
          window.aegisHoverDrag.started = plumbing.drag?.started === true;
          return createElement(Hand, {
            cards: [entry],
            draggingInstanceId: plumbing.drag?.instanceId,
            startDrag: (index, event, origin) => plumbing.startHandDrag(index, entry, event, origin),
          });
        }
        createRoot(host).render(createElement(I18nProvider, null, createElement(DragProbe)));
      });
      const slot = page.locator('[data-hand-instance-id="hover-drag"]');
      await slot.waitFor();
      const point = await visiblePoint(slot);
      await page.mouse.move(point.x, point.y);
      const face = page.locator('[data-hand-hover-instance-id="hover-drag"]');
      await face.waitFor({ state: "visible" });
      const rect = await face.boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height * 0.15);
      await page.mouse.down();
      await page.mouse.move(rect.x + rect.width / 2, rect.y - 50, { steps: 3 });
      await page.waitForFunction(() => window.aegisHoverDrag.started);
      if (await face.count()) throw new Error("The enlarged face survived its drag press");
      await page.mouse.up();
      const result = await page.evaluate(() => window.aegisHoverDrag);
      if (
        page.aegisErrors.length ||
        result.taps ||
        result.drops.length !== 1 ||
        result.drops[0].id !== "hover-drag" ||
        result.drops[0].capture !== "hover-drag" ||
        !result.drops[0].connected ||
        result.started
      )
        throw new Error("Native drag lost the physical capture owner or dropped more than once");
      summary.push({ width, drag: true });
      console.log(`${width}px: native enlarged-face drag retained physical capture and dropped once`);
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL("summary.json", output),
    JSON.stringify(
      {
        summary,
        note: "Natural production Arena pointer hover/release, normalized against the guarded primary poses. This does not reconstruct every activation/drag/camera family.",
      },
      null,
      2,
    ),
  );
  console.log(`${summary.length} natural hover/selection/reduced-motion/touch/drag cases passed; no clock was sought`);
} finally {
  await browser.close();
}
