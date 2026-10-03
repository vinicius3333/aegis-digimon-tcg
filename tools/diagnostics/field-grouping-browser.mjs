import { execFileSync } from "node:child_process";

// Run against the visual crowded arena in an Orca browser tab:
// node tools/diagnostics/field-grouping-browser.mjs <browserPageId> [--clock]
// --clock advances native animations explicitly when an embedded tab cannot paint regularly.
const page = process.argv[2];
if (!page) throw new Error("Pass the Orca browserPageId of the crowded arena preview.");
async function probe(deterministicClock) {
  // Background embedded tabs may not composite between measurements. Optional
  // clock mode samples the same native keyframes at explicit elapsed times.
  const clocks = new WeakMap();
  const advanceAnimations = () => {
    if (!deterministicClock) return;
    for (const element of document.querySelectorAll(".game-battle-row--you [data-field-key]")) {
      for (const animation of element.getAnimations({ subtree: true })) {
        if (animation.playState !== "running" && !animation.pending) continue;
        const origin =
          clocks.get(animation) ?? (animation.startTime === null ? performance.now() : Number(animation.startTime));
        clocks.set(animation, origin);
        const elapsed = Math.max(0, performance.now() - origin);
        const end = animation.effect.getComputedTiming().endTime;
        animation.currentTime = Math.min(elapsed, end);
        if (elapsed >= end) animation.finish();
      }
    }
  };
  const action = async (label) => {
    const trigger = document.querySelector(".aegis-arena-demo-keywords");
    if (trigger.getAttribute("aria-expanded") !== "true") {
      trigger.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const button = [...document.querySelectorAll('[role="menuitem"]')].find((item) => label.test(item.textContent));
    if (!button) throw new Error(`Missing demo action: ${label}`);
    button.click();
  };
  const read = () =>
    [...document.querySelectorAll(".game-battle-row--you [data-field-key]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        key: element.dataset.fieldKey,
        name: element.getAttribute("aria-label"),
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
    });
  let throttledFrames = 0;
  const frame = () =>
    new Promise((resolve) => {
      const timer = setTimeout(() => {
        throttledFrames++;
        resolve();
      }, 50);
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  const initialAnimations = new Set(document.getAnimations());
  const sample = async (label, change) => {
    let previous = read();
    let last = performance.now();
    const started = last;
    const jumps = [];
    let peak = 0;
    await change();
    while (performance.now() - started < 1250) {
      await frame();
      advanceAnimations();
      const now = performance.now();
      const next = read();
      for (const card of next) {
        const before =
          previous.find((item) => item.key === card.key) ??
          previous
            .filter((item) => item.name?.split(" (")[0] === card.name?.split(" (")[0])
            .sort((a, b) => Math.abs(a.x - card.x) - Math.abs(b.x - card.x))[0];
        if (!before) continue;
        const distance = Math.hypot(card.x - before.x, card.y - before.y);
        const speed = distance / Math.max(16, now - last);
        peak = Math.max(peak, speed);
        if (distance > 8 && speed > 1.5)
          jumps.push({
            name: card.name,
            distance: Math.round(distance),
            at: Math.round(now - started),
            before: [before.x, before.y],
            after: [card.x, card.y],
            animations: [...document.querySelectorAll(".game-battle-row--you [data-field-key]")]
              .find((e) => e.dataset.fieldKey === card.key)
              ?.getAnimations()
              .map((a) => ({
                time: a.currentTime,
                state: a.playState,
                start: a.startTime,
                frames: a.effect.getKeyframes(),
              })),
          });
      }
      previous = next;
      last = now;
    }
    const elements = [...document.querySelectorAll(".game-battle-row--you [data-field-key]")];
    const unsettled = elements
      .filter((element) =>
        element
          .getAnimations({ subtree: true })
          .some(
            (animation) =>
              !initialAnimations.has(animation) &&
              (animation.playState === "running" || animation.pending) &&
              Number.isFinite(animation.effect.getComputedTiming().endTime),
          ),
      )
      .map((element) => element.getAttribute("aria-label"));
    const overlaps = [];
    const ami = read().filter((card) => card.name?.includes("Ami Aiba"));
    const copies = (card) => Number(card.name.match(/\((\d+) (?:cópias|copies)/)?.[1] ?? 1);
    const totalCopies = ami.reduce((total, card) => total + copies(card), 0);
    const suspendedCopies = ami
      .filter((card) => /Suspensa|Suspended/.test(card.name))
      .reduce((total, card) => total + copies(card), 0);
    const expectedSuspended = Number(label.match(/^suspend (\d)$/)?.[1] ?? 0);
    const expectedGroups = expectedSuspended === 1 || expectedSuspended === 2 ? 2 : 1;
    const correctGroups = totalCopies === 3 && suspendedCopies === expectedSuspended && ami.length === expectedGroups;
    for (let i = 1; i < ami.length; i++)
      if (Math.abs(ami[i].x - ami[i - 1].x) < 30) overlaps.push("Ami Aiba groups overlap");
    return {
      label,
      correctGroups,
      unsettled,
      overlaps,
      peakPixelsPerMs: +peak.toFixed(2),
      jumps,
      ami: read().filter((card) => card.name?.includes("Ami Aiba")),
    };
  };
  await action(/Desvirar seus Tamers|Unsuspend your Tamers/);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const results = [];
  for (let i = 1; i <= 3; i++)
    results.push(await sample(`suspend ${i}`, () => action(/Suspender uma Ami|Suspend one Ami/)));
  results.push(await sample("ready all", () => action(/Desvirar seus Tamers|Unsuspend your Tamers/)));
  results.push(
    await sample("rapid changes", async () => {
      await action(/Suspender uma Ami|Suspend one Ami/);
      setTimeout(() => action(/Suspender uma Ami|Suspend one Ami/), 120);
      setTimeout(() => action(/Desvirar seus Tamers|Unsuspend your Tamers/), 240);
    }),
  );
  return {
    viewport: [innerWidth, innerHeight],
    clock: deterministicClock ? "explicit native keyframe sampling" : "browser timeline",
    throttledFrames,
    results,
    passed: results.every(
      (result) =>
        result.correctGroups &&
        result.jumps.length === 0 &&
        result.unsettled.length === 0 &&
        result.overlaps.length === 0,
    ),
  };
}
const response = JSON.parse(
  execFileSync(
    "orca",
    ["eval", "--page", page, "--expression", `(${probe.toString()})(${process.argv.includes("--clock")})`, "--json"],
    {
      encoding: "utf8",
      timeout: 30000,
    },
  ),
);
if (!response.ok) throw new Error(JSON.stringify(response));
const result = typeof response.result.result === "string" ? JSON.parse(response.result.result) : response.result.result;
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.passed ? 0 : 1;
