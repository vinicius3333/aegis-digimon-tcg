import type { Page } from "@playwright/test";
import type { LiveMotionProbe } from "../src/dev/liveMotionProbe";

interface CardPose {
  at: number;
  fieldKey: string | undefined;
  permanentId: string | undefined;
  returning: boolean;
  cardName?: string;
  /** The number printed by TokenInfo's DP chip in this sampled DOM pose. */
  currentDP?: number;
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
  delayMs: number;
  easing: string;
}
interface Capture {
  startedAt: number;
  frame: number;
  frames: { at: number; sampledAt: number }[];
  truncated: boolean;
  poses: CardPose[];
  timings: AnimationTiming[];
  decisions: { label: string | null; openedAt: number; closedAt?: number }[];
  boards: {
    at: number;
    turnSeat: number;
    suspendedIds: string[];
    securityCounts: number[];
    permanentIds: string[];
    permanents: { permanentId: string; cardId: string; stackCount: number; currentDP: number }[];
  }[];
  peels: { key: string; permanentId?: string; cardId?: string; firstAt: number; lastAt: number; frames: number }[];
  dpPulses: { permanentId?: string; firstAt: number; lastAt: number; frames: number }[];
  phaseRibbons: { at: number; label: string; side: string | undefined }[];
  arrows: {
    at: number;
    key: string;
    source: string | undefined;
    target: string | undefined;
    gapPx: number;
    x: number;
    y: number;
  }[];
  returnLifecycle: {
    at: number;
    kind: "inserted" | "removed";
    returnId?: number;
    target?: string;
    connected: boolean;
    parent?: string;
  }[];
}
interface PacingWindow extends Window {
  __aegisLiveMotion: LiveMotionProbe;
  __keywordPacingCapture: Capture;
  __keywordPacingObserver?: MutationObserver;
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
      frames: [],
      truncated: false,
      poses: [],
      timings: [],
      decisions: [],
      boards: [],
      peels: [],
      dpPulses: [],
      phaseRibbons: [],
      arrows: [],
      returnLifecycle: [],
    };
    globals["__keywordPacingCapture"] = capture;
    const seen = new WeakSet<Animation>();
    const returnIds = new WeakMap<Element, number>();
    let returnSequence = 0;
    let decision: { element: Element; observation: Capture["decisions"][number] } | undefined;
    let boardKey = "";
    const peelObservations = new WeakMap<Element, Capture["peels"][number]>();
    const dpObservations = new WeakMap<Element, Capture["dpPulses"][number]>();
    let ribbonElement: Element | null = null;
    let arrowSignature = "";
    const returnId = (element: Element) => {
      if (element.getAttribute("data-testid") !== "field-group-return") return undefined;
      let id = returnIds.get(element);
      if (id === undefined) {
        id = ++returnSequence;
        returnIds.set(element, id);
      }
      return id;
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const [kind, nodes] of [
          ["inserted", record.addedNodes],
          ["removed", record.removedNodes],
        ] as const) {
          for (const node of nodes) {
            if (!(node instanceof HTMLElement)) continue;
            const copies = [node, ...node.querySelectorAll<HTMLElement>('[data-testid="field-group-return"]')].filter(
              (element) => element.dataset.testid === "field-group-return",
            );
            for (const copy of copies)
              capture.returnLifecycle.push({
                at: performance.now(),
                kind,
                returnId: returnId(copy),
                target: copy.dataset.returnTargetFieldKey,
                connected: copy.isConnected,
                parent: (record.target as HTMLElement).className,
              });
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    globals["__keywordPacingObserver"] = observer;
    const tick = (at: number) => {
      // Native animation observations use this same rAF timestamp. DOM reads can take
      // several milliseconds; performance.now() here would misorder events in one frame.
      capture.frames.push({ at, sampledAt: performance.now() });
      const lab = (
        window as unknown as {
          __aegisEffectsLab?: () => {
            board?: {
              visible?: {
                turn: { seat: number };
                players: {
                  securityCount: number;
                  battleArea: {
                    permanentId: string;
                    isSuspended: boolean;
                    currentDP: number;
                    topCard: { cardId: string };
                    stack?: unknown[];
                  }[];
                }[];
              };
            };
          };
        }
      ).__aegisEffectsLab?.();
      const visible = lab?.board?.visible;
      if (visible) {
        const sample = {
          turnSeat: visible.turn.seat,
          suspendedIds: visible.players.flatMap((player) =>
            player.battleArea.filter((card) => card.isSuspended).map((card) => card.permanentId),
          ),
          securityCounts: visible.players.map((player) => player.securityCount),
          permanentIds: visible.players.flatMap((player) => player.battleArea.map((card) => card.permanentId)),
          permanents: visible.players.flatMap((player) =>
            player.battleArea.map((card) => ({
              permanentId: card.permanentId,
              cardId: card.topCard.cardId,
              stackCount: card.stack?.length ?? 0,
              currentDP: card.currentDP,
            })),
          ),
        };
        const key = JSON.stringify(sample);
        if (key !== boardKey) {
          capture.boards.push({ at, ...sample });
          boardKey = key;
        }
      }
      for (const peel of document.querySelectorAll<HTMLElement>(".game-stack-strip-peel")) {
        const bounds = peel.getBoundingClientRect();
        const painted = [...peel.querySelectorAll(".game-stack-strip-peel__face, .game-stack-strip-peel__rim")].some(
          (part) => Number(getComputedStyle(part).opacity) > 0.01,
        );
        if (bounds.width <= 0 || bounds.height <= 0 || Number(getComputedStyle(peel).opacity) <= 0 || !painted)
          continue;
        let observation = peelObservations.get(peel);
        if (!observation) {
          observation = {
            key: peel.dataset.stackStrip ?? "",
            permanentId: peel.dataset.permanentId,
            cardId: peel.dataset.cardId,
            firstAt: at,
            lastAt: at,
            frames: 0,
          };
          peelObservations.set(peel, observation);
          capture.peels.push(observation);
        }
        observation.lastAt = at;
        observation.frames++;
      }
      for (const pulse of document.querySelectorAll<HTMLElement>(".game-dp-pulse")) {
        const bounds = pulse.getBoundingClientRect();
        const painted = [...pulse.querySelectorAll("i, em")].some(
          (part) => Number(getComputedStyle(part).opacity) > 0.01,
        );
        if (bounds.width <= 0 || bounds.height <= 0 || !painted) continue;
        let observation = dpObservations.get(pulse);
        if (!observation) {
          observation = {
            permanentId: pulse.closest<HTMLElement>("[data-drop][data-id]")?.dataset.id,
            firstAt: at,
            lastAt: at,
            frames: 0,
          };
          dpObservations.set(pulse, observation);
          capture.dpPulses.push(observation);
        }
        observation.lastAt = at;
        observation.frames++;
      }
      const ribbon = document.querySelector<HTMLElement>(".game-phase-banner");
      if (ribbon !== ribbonElement) {
        if (ribbon) capture.phaseRibbons.push({ at, label: ribbon.textContent ?? "", side: ribbon.dataset.side });
        ribbonElement = ribbon;
      }
      const arrows = document.querySelectorAll<SVGSVGElement>(".game-attack-arrow--tracking.game-attack-arrow--attack");
      const endpoints = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-drop="perm-you"], [data-drop="perm-opp"], .game-security-shield',
        ),
      ];
      let nextArrowSignature = "";
      for (const arrow of arrows) {
        const head = arrow.querySelector<SVGPathElement>(".game-attack-arrow__head");
        const matrix = head?.getScreenCTM();
        if (!matrix) continue;
        const point = new DOMPoint(0, 0).matrixTransform(matrix);
        const nearest = endpoints
          .filter((element) => element.dataset.id !== arrow.dataset.attackSource)
          .map((element) => {
            const face = element.querySelector<HTMLElement>(".game-card-enter > [data-state]") ?? element;
            const rect = face.getBoundingClientRect();
            return {
              target:
                element.dataset.id ??
                (element.classList.contains("game-security-shield--you") ? "security-you" : "security-opp"),
              gapPx: Math.hypot(
                Math.max(rect.left - point.x, 0, point.x - rect.right),
                Math.max(rect.top - point.y, 0, point.y - rect.bottom),
              ),
            };
          })
          .sort((a, b) => a.gapPx - b.gapPx)[0];
        const target = nearest && nearest.gapPx <= 8 ? nearest.target : undefined;
        const key = arrow.dataset.attackKey ?? "";
        nextArrowSignature += `${key}:${target};`;
        if (nextArrowSignature !== arrowSignature)
          capture.arrows.push({
            at,
            key,
            source: arrow.dataset.attackSource,
            target,
            gapPx: nearest?.gapPx ?? Infinity,
            x: point.x,
            y: point.y,
          });
      }
      arrowSignature = nextArrowSignature;
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
          delayMs: timing.delay ?? 0,
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
        const style = getComputedStyle(art);
        if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || Number(style.opacity) <= 0.01)
          continue;
        const cardName = art.getAttribute("title") ?? undefined;
        const name = [...art.querySelectorAll("span")].find((span) => span.textContent?.trim() === cardName);
        const chip = name?.nextElementSibling?.textContent?.trim().match(/^(\d+(?:\.\d+)?)\s*(K)?$/i);
        const currentDP = chip ? Number(chip[1]) * (chip[2] ? 1000 : 1) : undefined;
        capture.poses.push({
          at,
          fieldKey: element.dataset.fieldKey ?? element.dataset.returnTargetFieldKey,
          permanentId: element.dataset.id,
          returning: element.dataset.testid === "field-group-return",
          returnId: returnId(element),
          cardName,
          currentDP,
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
    globals["__keywordPacingObserver"]?.disconnect();
    globals["__aegisLiveMotion"].stop();
    return { ...capture, finishedAt: performance.now(), motion: globals["__aegisLiveMotion"].read() };
  });
}
