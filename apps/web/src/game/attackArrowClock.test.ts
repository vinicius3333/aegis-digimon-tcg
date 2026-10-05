// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { readAttackArrowClock as readClock } from "./attackArrowClock";
import { mostRecentAttackArrow, attackDeclarationKey } from "./trackingArrow";
function readAttackArrowClock({
  board,
  events,
  permanentId,
}: {
  board: HTMLElement;
  events: readonly ServerEvent[];
  permanentId: string;
}) {
  return readClock({ board, key: mostRecentAttackArrow(events)?.key ?? "unpainted", permanentId });
}

const attack: Extract<ServerEvent, { kind: "attackDeclared" }> = {
  kind: "attackDeclared",
  seat: 0,
  attackerPermanentId: "att",
  attackerCardId: "BT1-010",
  target: { kind: "permanent", permanentId: "def" },
};
const originalTimeline = Object.getOwnPropertyDescriptor(document, "timeline");
afterEach(() => {
  document.body.replaceChildren();
  if (originalTimeline) Object.defineProperty(document, "timeline", originalTimeline);
  else Reflect.deleteProperty(document, "timeline");
});

function painted({ age = 500, delay = 0, key = attackDeclarationKey(attack), paused = false, rate = 1 } = {}) {
  const board = document.createElement("div");
  board.innerHTML = `<svg class="game-attack-arrow--tracking" data-attack-key="${key}" data-attack-source="att"><rect class="game-attack-arrow__reveal" /></svg>`;
  document.body.append(board);
  Object.defineProperty(document, "timeline", { configurable: true, value: { currentTime: 1000 } });
  const animation = {
    animationName: "battle-arrow-extend",
    startTime: 1000 - age,
    currentTime: Math.min(310, age * rate),
    playbackRate: rate,
    playState: paused ? "paused" : "finished",
    effect: { getTiming: () => ({ delay }) },
  };
  board.querySelector("rect")!.getAnimations = vi.fn<() => Animation[]>(() => [animation as unknown as Animation]);
  return board;
}

describe("painted declaration clock", () => {
  it("includes the final settle after CSS currentTime has clamped", () => {
    const board = painted({ age: 340 });
    expect(readAttackArrowClock({ board, events: [attack], permanentId: "att" })).toMatchObject({
      elapsedMs: 340,
      remainingMs: 40,
    });
  });
  it("does not repeat a completed arrow at the close seam", () => {
    const board = painted();
    expect(
      readAttackArrowClock({
        board,
        events: [attack, { kind: "combatResolved", seat: 0, attackerPermanentId: "att", deletedPermanentIds: ["def"] }],
        permanentId: "att",
      }),
    ).toMatchObject({ key: attackDeclarationKey(attack), elapsedMs: 380, remainingMs: 0 });
  });
  it("rejects an old arrow when the same permanent declares another attack", () => {
    const board = painted();
    expect(
      readAttackArrowClock({
        board,
        events: [attack, { kind: "attackEnded", seat: 0, attackerPermanentId: "att" }, { ...attack }],
        permanentId: "att",
      }),
    ).toBeUndefined();
  });
  it("does not give an earlier battle the later declaration's painted clock", () => {
    const board = painted({ key: "attack:2:att" });
    expect(readClock({ board, key: "attack:1:att", permanentId: "att" })).toBeUndefined();
  });
  it("retains the original declaration clock across a redirect", () => {
    const board = painted({ age: 200 });
    expect(
      readAttackArrowClock({ board, events: [attack, { ...attack, redirected: true }], permanentId: "att" }),
    ).toMatchObject({ elapsedMs: 200, remainingMs: 180 });
  });
  it("includes the carried negative delay after a DOM remount", () => {
    const board = painted({ age: 30, delay: -200 });
    expect(readAttackArrowClock({ board, events: [attack], permanentId: "att" })).toMatchObject({
      elapsedMs: 230,
      remainingMs: 150,
    });
  });
  it("uses a paused CSS clock and rejects another permanent's clock", () => {
    const board = painted({ age: 900, paused: true });
    expect(readAttackArrowClock({ board, events: [attack], permanentId: "att" })).toMatchObject({
      elapsedMs: 310,
      remainingMs: 70,
    });
    expect(readAttackArrowClock({ board, events: [attack], permanentId: "other" })).toBeUndefined();
  });
  it("leaves an unpainted declaration to the full scene", () => {
    expect(
      readAttackArrowClock({ board: document.createElement("div"), events: [attack], permanentId: "att" }),
    ).toBeUndefined();
  });
  it.each([
    { rate: 0.5, age: 400, elapsedMs: 200 },
    { rate: 2, age: 170, elapsedMs: 340 },
  ])("reads the local declaration clock at $rate playback speed", ({ rate, age, elapsedMs }) => {
    const board = painted({ rate, age });
    expect(readAttackArrowClock({ board, events: [attack], permanentId: "att" })).toMatchObject({
      playbackRate: rate,
      elapsedMs,
      remainingMs: 380 - elapsedMs,
    });
  });
  it("uses the adjusted timeline origin after a playback speed change", () => {
    const board = painted({ rate: 2, age: 150, delay: -40 });
    expect(readAttackArrowClock({ board, events: [attack], permanentId: "att" })).toMatchObject({
      elapsedMs: 340,
      remainingMs: 40,
    });
  });
});
