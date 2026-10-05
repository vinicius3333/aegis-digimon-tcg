import type { Page } from "@playwright/test";
import type { LiveMotionProbe } from "../src/dev/liveMotionProbe";

interface CardPose {
  at: number;
  fieldKey: string | undefined;
  permanentId: string | undefined;
  returning: boolean;
  returnId?: number;
  x: number;
  y: number;
  angle: number;
}
interface AnimationTiming {
  at: number;
  fieldKey: string | undefined;
  permanentId: string | undefined;
  returning: boolean;
  returnId?: number;
  properties: string[];
  duration: number | string;
  easing: string;
}
interface Capture {
  startedAt: number;
  frame: number;
  truncated: boolean;
  poses: CardPose[];
  timings: AnimationTiming[];
  decisions: { label: string | null; openedAt: number; closedAt?: number }[];
}
interface PacingWindow extends Window {
  __aegisLiveMotion: LiveMotionProbe;
  __keywordPacingCapture: Capture;
}

/** The gesture boundary, DOM poses and native animation clocks share performance.now().
 * This is browser observation, not a server execution or network receipt timestamp. */
export async function startPacingCapture(page: Page) {
  await page.evaluate(() => {
    const globals = window as unknown as PacingWindow;
    globals["__aegisLiveMotion"].reset();
    globals["__aegisLiveMotion"].start();
    const capture: Capture = {
      startedAt: performance.now(),
      frame: 0,
      truncated: false,
      poses: [],
      timings: [],
      decisions: [],
    };
    globals["__keywordPacingCapture"] = capture;
    const seen = new WeakSet<Animation>();
    const returnIds = new WeakMap<Element, number>();
    let returnSequence = 0;
    let decision: { element: Element; observation: Capture["decisions"][number] } | undefined;
    const returnId = (element: Element) => {
      if (element.getAttribute("data-testid") !== "field-group-return") return undefined;
      let id = returnIds.get(element);
      if (id === undefined) {
        id = ++returnSequence;
        returnIds.set(element, id);
      }
      return id;
    };
    const tick = () => {
      const at = performance.now();
      const dialog = document.querySelector('[role="dialog"], [data-testid="board-prompt"]');
      if (decision && decision.element !== dialog) {
        decision.observation.closedAt = at;
        decision = undefined;
      }
      if (dialog && !decision && Number(getComputedStyle(dialog).opacity) > 0) {
        const observation = { label: dialog.getAttribute("aria-label"), openedAt: at };
        capture.decisions.push(observation);
        decision = { element: dialog, observation };
      }
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target;
        if (!(target instanceof HTMLElement) || seen.has(animation)) continue;
        seen.add(animation);
        const field = target.closest<HTMLElement>("[data-field-key]");
        const returning = target.dataset.testid === "field-group-return";
        if (!field && !returning) continue;
        const timing = effect!.getTiming();
        capture.timings.push({
          at,
          fieldKey: field?.dataset.fieldKey,
          permanentId: field?.dataset.id,
          returning,
          returnId: returnId(target),
          properties: [...new Set(effect!.getKeyframes().flatMap((frame) => Object.keys(frame)))],
          duration: typeof timing.duration === "number" ? timing.duration : String(timing.duration),
          easing: timing.easing ?? "linear",
        });
      }
      for (const element of document.querySelectorAll<HTMLElement>(
        '[data-field-key], [data-testid="field-group-return"]',
      )) {
        const art =
          element.dataset.testid === "field-group-return"
            ? element
            : element.querySelector<HTMLElement>(".game-card-enter > [data-state]");
        if (!art) continue;
        const rect = art.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        capture.poses.push({
          at,
          fieldKey: element.dataset.fieldKey ?? element.dataset.returnTargetFieldKey,
          permanentId: element.dataset.id,
          returning: element.dataset.testid === "field-group-return",
          returnId: returnId(element),
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          angle: Number.parseFloat(getComputedStyle(art).rotate) || 0,
        });
      }
      if (capture.poses.length > 12_000 || capture.timings.length > 1000) {
        capture.truncated = true;
        return;
      }
      capture.frame = requestAnimationFrame(tick);
    };
    capture.frame = requestAnimationFrame(tick);
  });
}

export async function finishPacingCapture(page: Page) {
  return page.evaluate(() => {
    const globals = window as unknown as PacingWindow;
    const capture = globals["__keywordPacingCapture"];
    cancelAnimationFrame(capture.frame);
    globals["__aegisLiveMotion"].stop();
    return { ...capture, finishedAt: performance.now(), motion: globals["__aegisLiveMotion"].read() };
  });
}
