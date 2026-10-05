import { afterEach, expect, it, vi } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { createAnimationQueue } from "../../animationQueue";
import { createPresentationGate, observeGateExpiry, waitForGate } from "../presentationGate";
import type { RemovalLink } from "../removalChain";
import type { HeldDeletion, MatchCueAnchors } from "../types";
import { enqueueHandReturns, planHandReturns, type FlyCardToHand } from "./handReturns";

afterEach(() => vi.useRealTimers());
const event: ServerEvent = {
  kind: "cardsMoved",
  from: "various",
  to: "hand",
  handAddition: "transfer",
  seat: 0,
  instanceIds: ["first-top", "private", "second-top"],
  returnedPermanents: [
    { permanentId: "first", instanceId: "first-top", cardId: "BT1-010", seat: 0 },
    { permanentId: "second", instanceId: "second-top", cardId: "BT1-043", seat: 1 },
  ],
};
function fixture(flyCardToHand: FlyCardToHand, movement: ServerEvent = event, withPeel = false) {
  const queue = createAnimationQueue();
  const cause = createPresentationGate();
  const peel = createPresentationGate();
  const keyRef = { current: withPeel ? 1 : 0 };
  if (withPeel)
    queue.enqueue({
      id: "stack-strip-peel-1",
      track: "stackStripPeel",
      async run(context) {
        await waitForGate(peel, context, 5000, "test/peel");
      },
    });
  const plan = planHandReturns([movement]);
  const chain = { current: null as RemovalLink | null };
  let held: ReadonlyMap<number, HeldDeletion> = new Map();
  let x = 10;
  const anchors: MatchCueAnchors = {
    board: { current: null },
    yourDeck: { current: null },
    oppDeck: { current: null },
    yourHandDock: { current: null },
    oppHandStrip: { current: null },
    yourSecurity: { current: null },
    oppSecurity: { current: null },
    permanentStack: (permanentId) => ({ x, y: 50, width: 116, height: 162, angle: 90, permanentId }),
  };
  const entries: number[] = [];
  queue.enqueue({
    id: "hand-entry",
    track: "hand-entry",
    async run(context) {
      await waitForGate(plan.completed, context, 5000, "test/entry");
      if (!context.cancelled && !context.skipping) entries.push(Date.now());
    },
  });
  enqueueHandReturns({
    queue,
    plan,
    snapshots: [
      {
        stateVersion: 1,
        state: {
          players: [
            { battleArea: [{ permanentId: "first" }], trash: [] },
            { battleArea: [{ permanentId: "second" }], trash: [] },
          ],
        } as unknown as GameState,
      },
    ],
    anchors,
    removalChainRef: chain,
    causingEffectGate: cause,
    holdKeyRef: keyRef,
    setHeldDeletions: (next) => {
      held = typeof next === "function" ? next(held) : next;
    },
    flyCardToHand,
    enqueue: (step) => queue.enqueue(step),
  });
  return {
    queue,
    peel,
    cause,
    plan,
    chain,
    entries,
    held: () => [...held.values()].map((hold) => hold.permanent.permanentId),
    move: (next: number) => {
      x = next;
    },
  };
}

it("measures the current orientation after the cause, serializes full returns and delays every hand entry", async () => {
  vi.useFakeTimers();
  const starts: number[] = [],
    ends: number[] = [];
  const run = fixture(async (_card, from, _seat, context) => {
    expect(from.angle).toBe(90);
    starts.push(from.x);
    await context.wait(250);
    await context.wait(100);
    ends.push(Date.now());
    return true;
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(starts).toEqual([]);
  expect(run.held()).toEqual(["first", "second"]);
  run.move(35);
  run.cause.release();
  await vi.advanceTimersByTimeAsync(32);
  expect(starts).toEqual([35]);
  expect(run.held()).toEqual(["second"]);
  await vi.advanceTimersByTimeAsync(300);
  expect(run.entries).toEqual([]);
  expect(starts).toEqual([35]);
  run.move(70);
  await vi.advanceTimersByTimeAsync(80);
  expect(starts).toEqual([35, 70]);
  expect(run.entries).toEqual([]);
  await vi.runAllTimersAsync();
  await run.queue.idle();
  expect(run.entries).toHaveLength(1);
  expect(run.entries[0]).toBeGreaterThanOrEqual(ends[1]!);
  expect(run.plan.beforeEntry.get("private")).toBeUndefined();
  expect(run.chain.current?.finished?.open).toBe(true);
  expect(run.held()).toEqual([]);
});

it.each(["clear", "skip"] as const)("%s releases field holds and entry gates without flying", async (action) => {
  vi.useFakeTimers();
  const fly = vi.fn<FlyCardToHand>();
  const run = fixture(fly);
  await vi.advanceTimersByTimeAsync(0);
  run.queue[action]();
  await vi.runAllTimersAsync();
  await run.queue.idle();
  expect(fly).not.toHaveBeenCalled();
  expect(run.plan.completed.open).toBe(true);
  expect(run.chain.current?.finished?.open).toBe(true);
  expect(run.held()).toEqual([]);
});

it("does not animate staging, unrelated zones or private additions", () => {
  expect(planHandReturns([{ ...event, handAddition: "staging" }]).returns).toEqual([]);
  expect(planHandReturns([{ ...event, to: "deckBottom" }]).returns).toEqual([]);
  expect(planHandReturns([{ ...event, returnedPermanents: undefined }]).returns).toEqual([]);
});

it("starts predecessor ceilings only when an eighteen-host serial return can reach them", async () => {
  vi.useFakeTimers();
  const expired: string[] = [];
  const stop = observeGateExpiry((expiry) => expired.push(expiry.label));
  try {
    const returnedPermanents = Array.from({ length: 18 }, (_, index) => ({
      permanentId: `host-${index}`,
      instanceId: `top-${index}`,
      cardId: "BT1-010",
      seat: 0 as const,
    }));
    const movement: ServerEvent = {
      ...event,
      instanceIds: returnedPermanents.map((returned) => returned.instanceId),
      returnedPermanents,
    };
    let active = 0,
      completed = 0;
    const run = fixture(async (_card, _from, _seat, context) => {
      expect(active).toBe(0);
      active++;
      await context.wait(350);
      active--;
      completed++;
      return true;
    }, movement);
    run.cause.release();
    await vi.runAllTimersAsync();
    await run.queue.idle();
    expect(completed).toBe(18);
    expect(expired).toEqual([]);
    expect(run.entries).toHaveLength(1);
  } finally {
    stop();
  }
});

it("waits for source peels before the complete stack leaves for the hand", async () => {
  vi.useFakeTimers();
  const fly = vi.fn<FlyCardToHand>().mockResolvedValue(true);
  const run = fixture(fly, event, true);
  run.cause.release();
  await vi.advanceTimersByTimeAsync(32);
  expect(fly).not.toHaveBeenCalled();
  expect(run.plan.completed.open).toBe(false);
  run.peel.release();
  await vi.runAllTimersAsync();
  await run.queue.idle();
  expect(fly).toHaveBeenCalledTimes(2);
  expect(run.plan.completed.open).toBe(true);
});
