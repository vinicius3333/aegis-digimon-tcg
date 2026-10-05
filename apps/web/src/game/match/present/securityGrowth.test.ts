// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Seat, ServerEvent } from "@aegis/shared";
import { createAnimationQueue } from "../../animationQueue";
import { cueFlights } from "../flights";
import { createPresentationGate } from "../presentationGate";
import { enqueueSecurityGrowth } from "./securityGrowth";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function recoverySequence(seat: Seat = 0) {
  const queue = createAnimationQueue();
  const cause = createPresentationGate();
  const node = document.createElement("div");
  let landings: ReadonlyMap<number, number> = new Map();
  const changes: boolean[] = [];
  const setSecurityFlights: Parameters<typeof cueFlights>[0]["setSecurityFlights"] = (next) => {
    landings = typeof next === "function" ? next(landings) : next;
    changes.push(landings.has(seat));
  };
  const { launchSecurityGainFlight } = cueFlights({
    queue,
    anchors: {
      board: { current: node },
      yourDeck: { current: node },
      oppDeck: { current: node },
      yourHandDock: { current: node },
      oppHandStrip: { current: node },
      yourSecurity: { current: node },
      oppSecurity: { current: node },
    },
    viewerSeat: 0,
    presentationBatchRef: { current: { batchId: "recovery", stateVersion: 2 } },
    causingEffectGateRef: { current: cause },
    securityGainKeyRef: { current: 0 },
    drawFlightKeyRef: { current: 0 },
    setSecurityFlights,
    setSecurityDealCounts: () => {},
    setDrawFlights: () => {},
    setDrawBursts: () => {},
    setHeldHandArrivals: () => {},
  });
  const enqueue = (fresh: readonly ServerEvent[]) =>
    enqueueSecurityGrowth({
      fresh,
      stateVersion: 2,
      securityGrowthClaimedRef: { current: new Map() },
      launchSecurityGainFlight,
    });
  const recover = () => enqueue([{ kind: "securityRecovered", seat, amount: 2 }]);
  return { queue, cause, node, changes, enqueue, recover, landings: () => landings };
}

it.each([0, 1] as const)("keeps seat%s's real recovery receipt behind its source announcement", async (seat) => {
  const sequence = recoverySequence(seat);
  sequence.recover();
  await vi.advanceTimersByTimeAsync(32);
  expect(sequence.landings().size).toBe(0);
  sequence.cause.release();
  await vi.advanceTimersByTimeAsync(16);
  expect(sequence.landings().has(seat)).toBe(true);
  await vi.advanceTimersByTimeAsync(200);
  expect(sequence.landings().size).toBe(0);
  expect(sequence.queue.isIdle()).toBe(true);
});

it("keeps consecutive recovery receipts without replacing the preceding causal beat", async () => {
  const sequence = recoverySequence();
  sequence.cause.release();
  sequence.recover();
  await vi.advanceTimersByTimeAsync(32);
  sequence.recover();
  await vi.advanceTimersByTimeAsync(500);
  expect(sequence.changes).toEqual([true, false, true, false]);
  expect(sequence.queue.isIdle()).toBe(true);
});

it("plays a paired movement and recovery receipt as one security reaction", async () => {
  const sequence = recoverySequence();
  sequence.cause.release();
  sequence.enqueue([
    { kind: "cardsMoved", from: "deck", to: "security", seat: 0, instanceIds: ["first", "second"] },
    { kind: "securityRecovered", seat: 0, amount: 2 },
  ]);
  await vi.advanceTimersByTimeAsync(500);
  expect(sequence.changes).toEqual([true, false]);
});

it("retains a late native recovery clock until its painted endpoint", async () => {
  const sequence = recoverySequence();
  let nativeAge = 50;
  const animation = {
    animationName: "battle-security-flight",
    playState: "running",
    startTime: null,
    get currentTime() {
      return nativeAge;
    },
    effect: { getTiming: () => ({ delay: 0 }) },
  } as unknown as Animation;
  sequence.node.getAnimations = () => [animation];
  sequence.cause.release();
  sequence.recover();
  await vi.advanceTimersByTimeAsync(210);
  expect(sequence.landings().has(0)).toBe(true);
  nativeAge = 200;
  await vi.advanceTimersByTimeAsync(16);
  expect(sequence.landings().size).toBe(0);
  expect(sequence.queue.isIdle()).toBe(true);
});
