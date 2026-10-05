import { afterEach, expect, it, vi } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { createAnimationQueue } from "../../animationQueue";
import { createPresentationGate } from "../presentationGate";
import type { RemovalLink } from "../removalChain";
import type { HeldDeletion, MatchCueAnchors } from "../types";
import { enqueueDeckReturns, type FlyCardToDeck } from "./deckReturns";

afterEach(() => vi.useRealTimers());

const event: ServerEvent = {
  kind: "cardsMoved",
  seat: 0,
  from: "battleArea",
  to: "deckBottom",
  instanceIds: ["first", "second"],
  returnedPermanents: [
    { permanentId: "first", instanceId: "first-top", cardId: "BT1-010", seat: 0 },
    { permanentId: "second", instanceId: "second-top", cardId: "BT1-043", seat: 1 },
  ],
};

function fixture(flyCardToDeck: FlyCardToDeck, cause = createPresentationGate()) {
  const queue = createAnimationQueue();
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
    permanentCenter: () => ({ x: -1, y: -1 }),
    permanentStack: (permanentId) => ({ x, y: 50, width: 116, height: 162, angle: 0, permanentId }),
  };
  enqueueDeckReturns({
    fresh: [event],
    snapshots: [],
    anchors,
    removalChainRef: chain,
    causingEffectGate: cause,
    holdKeyRef: { current: 0 },
    setHeldDeletions: (next) => {
      held = typeof next === "function" ? next(held) : next;
    },
    flyCardToDeck,
    enqueue: (step) => queue.enqueue(step),
  });
  return {
    queue,
    chain,
    cause,
    move: (nextX: number) => {
      x = nextX;
    },
  };
}

it("measures the physical stack after its cause and waits for the whole 410ms return before another host", async () => {
  vi.useFakeTimers();
  const starts: number[] = [],
    active: string[] = [];
  const run = fixture(async (card, from, _seat, context) => {
    starts.push(from.x);
    expect(active).toEqual([]);
    active.push(card.cardId);
    await context.wait(410);
    active.pop();
    return true;
  });
  await vi.advanceTimersByTimeAsync(0);
  expect(starts).toEqual([]);
  run.move(35);
  run.cause.release();
  await vi.advanceTimersByTimeAsync(32);
  expect(starts).toEqual([35]);
  await vi.advanceTimersByTimeAsync(350);
  expect(active).toEqual(["BT1-010"]);
  expect(starts).toEqual([35]);
  run.move(70);
  await vi.advanceTimersByTimeAsync(100);
  expect(starts).toEqual([35, 70]);
  await vi.runAllTimersAsync();
  await run.queue.idle();
  expect(active).toEqual([]);
  expect(run.chain.current?.finished?.open).toBe(true);
});

it("clearing a return blocked on its cause releases the discarded removal lifetime", async () => {
  vi.useFakeTimers();
  const fly = vi.fn<FlyCardToDeck>();
  const run = fixture(fly);
  await vi.advanceTimersByTimeAsync(0);
  run.queue.clear();
  await vi.runAllTimersAsync();
  await run.queue.idle();
  expect(fly).not.toHaveBeenCalled();
  expect(run.chain.current?.finished?.open).toBe(true);
});

it("skipping a gated chain draws nothing and releases every removal", async () => {
  vi.useFakeTimers();
  const fly = vi.fn<FlyCardToDeck>();
  const run = fixture(fly);
  await vi.advanceTimersByTimeAsync(0);
  run.queue.skip();
  await vi.runAllTimersAsync();
  await run.queue.idle();
  expect(fly).not.toHaveBeenCalled();
  expect(run.chain.current?.finished?.open).toBe(true);
});
