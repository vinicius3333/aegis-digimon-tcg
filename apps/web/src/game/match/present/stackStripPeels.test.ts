import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import type { DeleteBurst, MatchCueAnchors } from "../types";
import { enqueueStackStripPeels } from "./stackStripPeels";

const anchors = {
  board: { current: null },
  permanentCenter: (permanentId: string) => (permanentId === "perm-1" ? { x: 200, y: 300 } : undefined),
  yourDeck: { current: null },
  oppDeck: { current: null },
  yourHandDock: { current: null },
  oppHandStrip: { current: null },
  yourSecurity: { current: null },
  oppSecurity: { current: null },
} satisfies MatchCueAnchors;

const deDigivolved: ServerEvent = {
  kind: "cardsMoved",
  instanceIds: ["king"],
  cardIds: ["EX13-035"],
  seat: 0,
  from: "battleArea",
  to: "trash",
  strippedStackTops: { permanentId: "perm-1", reason: "deDigivolve", sourceCardId: "BT25-025" },
};

function collect(fresh: readonly ServerEvent[]) {
  const steps: AnimationStep[] = [];
  let bursts: readonly DeleteBurst[] = [];
  enqueueStackStripPeels({
    fresh,
    anchors,
    deleteBurstKeyRef: { current: 0 },
    causingEffectGate: null,
    setDeleteBursts: (next) => {
      bursts = typeof next === "function" ? next(bursts) : next;
    },
    enqueue: (step) => steps.push(step),
  });
  return { steps, bursts: () => bursts };
}

describe("enqueueStackStripPeels", () => {
  it("peels the stripped card off the permanent it left, on that permanent's own track", () => {
    const { steps } = collect([deDigivolved]);
    expect(steps.map(({ id, track }) => ({ id, track }))).toEqual([
      { id: "stack-strip-peel-1", track: "stackStripPeel-perm-1" },
    ]);
  });

  it("does nothing for a deletion, a plain trash, or a permanent the board never measured", () => {
    const plain: ServerEvent = { kind: "cardsMoved", instanceIds: ["a"], from: "hand", to: "trash" };
    const unmeasured: ServerEvent = {
      ...deDigivolved,
      strippedStackTops: { permanentId: "perm-9", reason: "deDigivolve" },
    } as ServerEvent;
    expect(collect([plain, unmeasured]).steps).toEqual([]);
  });

  it("draws the stripped card over its permanent for the peel's duration, then removes it", async () => {
    const { steps, bursts } = collect([deDigivolved]);
    const drawn: (readonly DeleteBurst[])[] = [];
    await steps[0]!.run({
      mode: "live",
      cancelled: false,
      skipping: false,
      wait: async () => {
        drawn.push(bursts());
      },
    });
    expect(drawn).toEqual([[{ key: 1, x: 164, y: 250, cardId: "EX13-035", stackStrip: true }]]);
    expect(bursts()).toEqual([]);
  });

  it.each([
    ["a replay", { mode: "replay", skipping: false }],
    ["a fast-forward", { mode: "live", skipping: true }],
  ] as const)("draws nothing during %s", async (_label, playback) => {
    const { steps, bursts } = collect([deDigivolved]);
    let waited = false;
    await steps[0]!.run({
      ...playback,
      cancelled: false,
      wait: async () => {
        waited = true;
      },
    });
    expect(waited).toBe(false);
    expect(bursts()).toEqual([]);
  });
});
