import { describe, expect, it } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { createAnimationQueue, type AnimationQueue, type AnimationStep } from "../../animationQueue";
import type { StateSnapshot } from "../../../net/presentedState";
import type { DeleteBurst, HeldStackStrip, MatchCueAnchors } from "../types";
import { enqueueStackStripPeels } from "./stackStripPeels";
import { createStackTopResolutions, type StackTopResolutions } from "../stackTopResolutions";

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

function collect(
  fresh: readonly ServerEvent[],
  snapshots: readonly StateSnapshot[] = [],
  measured = anchors,
  topResolutions?: StackTopResolutions,
) {
  const steps: AnimationStep[] = [];
  let bursts: readonly DeleteBurst[] = [];
  let held: ReadonlyMap<number, HeldStackStrip> = new Map();
  enqueueStackStripPeels({
    queue: { idle: () => new Promise<void>(() => {}) } as AnimationQueue,
    snapshots,
    stateVersion: 1,
    viewerSeat: 0,
    setHeldStackStrips: (next) => {
      held = typeof next === "function" ? next(held) : next;
    },
    fresh,
    anchors: measured,
    deleteBurstKeyRef: { current: 0 },
    causingEffectGate: null,
    setDeleteBursts: (next) => {
      bursts = typeof next === "function" ? next(bursts) : next;
    },
    enqueue: (step) => steps.push(step),
    topResolutions,
  });
  return { steps, bursts: () => bursts, held: () => held };
}

describe("enqueueStackStripPeels", () => {
  it("releases a queued hold when a paused queue is cleared before its peel runs", () => {
    const permanent = { permanentId: "perm-1", topCard: { instanceId: "king", cardId: "EX13-035" }, stack: [] };
    const snapshots = [
      {
        stateVersion: 0,
        state: {
          players: [
            { battleArea: [permanent], trash: [] },
            { battleArea: [], trash: [] },
          ],
        } as unknown as GameState,
      },
    ];
    const { steps, held } = collect([deDigivolved], snapshots);
    const queue = createAnimationQueue();
    queue.pause();
    queue.enqueue(steps[0]!);
    expect(held().size).toBe(1);
    queue.clear();
    expect(held().size).toBe(0);
  });
  it("hands off each invocation's resolved DP without borrowing a later invocation's bonus", async () => {
    const cards = ["rookie", "champion", "ultimate"].map((instanceId) => ({ instanceId, cardId: "ST1-07" }));
    const permanent = {
      permanentId: "perm-1",
      topCard: cards[2]!,
      stack: cards.slice(0, 2),
      baseDP: 12000,
      currentDP: 12000,
    };
    const snapshots = [
      {
        stateVersion: 0,
        state: {
          players: [
            { battleArea: [permanent], trash: [] },
            { battleArea: [], trash: [] },
          ],
        } as unknown as GameState,
      },
    ];
    const resolutions = createStackTopResolutions();
    const fresh = [cards[2]!, cards[1]!].map((card, index) => ({
      kind: "cardsMoved",
      instanceIds: [card.instanceId],
      cardIds: [card.cardId],
      seat: 0,
      from: "battleArea",
      to: "trash",
      strippedStackTops: {
        permanentId: "perm-1",
        reason: "deDigivolve",
        sequenceId: `invocation-${index}`,
      },
    })) as ServerEvent[];
    resolutions.record(
      [7000, 4500].map((currentDP, index) => ({
        kind: "stackTopResolved",
        sequenceId: `invocation-${index}`,
        permanentId: "perm-1",
        strippedInstanceId: cards[2 - index]!.instanceId,
        topInstanceId: cards[1 - index]!.instanceId,
        baseDP: index === 0 ? 7000 : 3000,
        currentDP,
      })),
    );
    const { steps, held } = collect(fresh, snapshots, anchors, resolutions);
    const seen: { top: string; dp: number }[] = [];
    for (const step of steps) {
      await step.run({
        mode: "live",
        cancelled: false,
        skipping: false,
        wait: async () => {
          const host = [...held().values()][0]!.permanent;
          seen.push({ top: host.topCard.instanceId, dp: host.currentDP });
        },
      });
    }
    expect(seen).toEqual([
      { top: "ultimate", dp: 12000 },
      { top: "champion", dp: 7000 },
    ]);
    expect(held().size).toBe(0);
  });
  it("keeps each consecutive cost's DP while sharing physical source progress on one host", async () => {
    const sources = ["a", "b", "c"].map((instanceId) => ({ instanceId, cardId: "ST3-02" }));
    const permanent = { permanentId: "perm-1", topCard: { instanceId: "top", cardId: "BT4-046" }, stack: sources };
    const snapshots = [
      {
        stateVersion: 0,
        state: {
          players: [
            { battleArea: [permanent], trash: [] },
            { battleArea: [], trash: [] },
          ],
        } as unknown as GameState,
      },
    ];
    const receipts = [12000, 10000].map((currentDP, index) => ({
      kind: "cardsMoved",
      instanceIds: [sources[index]!.instanceId],
      cardIds: ["ST3-02"],
      seat: 0,
      from: "various",
      to: "trash",
      trashedSources: {
        permanentId: "perm-1",
        hostCardId: "BT4-046",
        digiBurstDpBefore: [{ permanentId: "target", currentDP }],
      },
    })) as ServerEvent[];
    const { steps, held } = collect(receipts, snapshots);
    const seen: { sources: number; dp: number | undefined }[][] = [];
    for (const step of steps)
      await step.run({
        mode: "live",
        cancelled: false,
        skipping: false,
        wait: async () => {
          seen.push(
            [...held().values()].map((strip) => ({
              sources: strip.permanent.stack.length,
              dp: strip.beforeCostDps?.get("target"),
            })),
          );
        },
      });
    expect(seen).toEqual([
      [
        { sources: 3, dp: 12000 },
        { sources: 3, dp: 10000 },
      ],
      [{ sources: 2, dp: 10000 }],
    ]);
  });
  it("uses the cost receipt's pre-cost DP even when the available patch already contains the result", async () => {
    const sources = ["a", "b", "c"].map((instanceId) => ({ instanceId, cardId: "ST3-02" }));
    const permanent = { permanentId: "perm-1", topCard: { instanceId: "top", cardId: "BT4-046" }, stack: sources };
    const snapshots = [
      {
        stateVersion: 0,
        state: {
          players: [
            { battleArea: [permanent], trash: [] },
            { battleArea: [{ permanentId: "target", currentDP: 8000 }], trash: [] },
          ],
        } as unknown as GameState,
      },
    ];
    const receipt: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["a", "b"],
      cardIds: ["ST3-02", "ST3-02"],
      seat: 0,
      from: "various",
      to: "trash",
      trashedSources: {
        permanentId: "perm-1",
        hostCardId: "BT4-046",
        digiBurstDpBefore: [{ permanentId: "target", currentDP: 12000 }],
      },
    };
    const { steps, held } = collect([receipt], snapshots);
    const seen: { sources: number; dp: number | undefined }[] = [];
    await steps[0]!.run({
      mode: "live",
      cancelled: false,
      skipping: false,
      wait: async () => {
        const strip = [...held().values()][0]!;
        seen.push({ sources: strip.permanent.stack.length, dp: strip.beforeCostDps?.get("target") });
      },
    });
    expect(seen).toEqual([
      { sources: 3, dp: 12000 },
      { sources: 2, dp: 12000 },
    ]);
    expect(held().size).toBe(0);
  });
  it("peels the stripped card off the permanent it left, on the shared source-removal track", () => {
    const { steps } = collect([deDigivolved]);
    expect(steps.map(({ id, track }) => ({ id, track }))).toEqual([
      { id: "stack-strip-peel-1", track: "stackStripPeel" },
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
    expect(drawn).toMatchObject([
      [
        {
          key: 1,
          x: 192,
          y: 288.8,
          cardId: "EX13-035",
          stackStrip: true,
          stackStripDirection: 1,
          face: { width: 16, height: 22.4, angle: 0 },
        },
      ],
    ]);
    expect(bursts()).toEqual([]);
  });

  it("presents every stripped top when a multi-level removal arrives as one batch", async () => {
    const { steps, bursts } = collect([
      { ...deDigivolved, instanceIds: ["king", "queen", "rook"], cardIds: ["EX13-035", "BT16-024", "BT16-025"] },
    ]);
    const seen: string[] = [];
    await steps[0]!.run({
      mode: "live",
      cancelled: false,
      skipping: false,
      wait: async () => {
        seen.push(bursts()[0]!.cardId!);
      },
    });
    expect(seen).toEqual(["EX13-035", "BT16-024", "BT16-025"]);
    expect(bursts()).toEqual([]);
  });

  it("peels each trashed digivolution card off its Digimon, one after another", async () => {
    const trashedSources: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["s1-19", "s1-20"],
      cardIds: ["BT16-024", "BT16-025"],
      artIds: ["BT16-024", "BT16-025_P1"],
      seat: 1,
      from: "various",
      to: "trash",
      trashedSources: { permanentId: "perm-1", hostCardId: "EX6-035", sourceCardId: "EX12-035" },
    };
    const { steps, bursts } = collect([trashedSources]);
    expect(steps.map(({ id, track }) => ({ id, track }))).toEqual([
      { id: "stack-strip-peel-1", track: "stackStripPeel" },
    ]);
    const drawn: (readonly DeleteBurst[])[] = [];
    await steps[0]!.run({
      mode: "live",
      cancelled: false,
      skipping: false,
      wait: async () => {
        drawn.push(bursts());
      },
    });
    expect(drawn).toMatchObject([
      [{ key: 1, x: 192, y: 288.8, cardId: "BT16-024", stackStrip: true, stackStripDirection: -1 }],
      [
        {
          key: 2,
          x: 192,
          y: 288.8,
          cardId: "BT16-025",
          artId: "BT16-025_P1",
          stackStrip: true,
          stackStripDirection: -1,
        },
      ],
    ]);
    expect(bursts()).toEqual([]);
  });

  it.each(["sources", "tops"] as const)(
    "keeps successive %s peels on the same host progressing through a coalesced patch",
    async (kind) => {
      const cards = ["ST20-06", "ST21-08", "AD1-025"].map((cardId, index) => ({ instanceId: `card-${index}`, cardId }));
      const permanent = { permanentId: "perm-1", topCard: cards[2]!, stack: cards.slice(0, 2) };
      const snapshots = [
        {
          stateVersion: 0,
          state: {
            players: [
              { battleArea: [permanent], trash: [] },
              { battleArea: [], trash: [] },
            ],
          } as unknown as GameState,
        },
      ];
      const fresh = [kind === "tops" ? cards[2]! : cards[1]!, kind === "tops" ? cards[1]! : cards[0]!].map((card) => ({
        kind: "cardsMoved",
        instanceIds: [card.instanceId],
        cardIds: [card.cardId],
        seat: 0,
        from: "various",
        to: "trash",
        ...(kind === "tops"
          ? { strippedStackTops: { permanentId: "perm-1", reason: "deDigivolve" } }
          : { trashedSources: { permanentId: "perm-1", hostCardId: cards[2]!.cardId } }),
      })) as ServerEvent[];
      const { steps, held } = collect(fresh, snapshots);
      const observed: { stack: string[]; top: string }[] = [];
      for (const step of steps)
        await step.run({
          mode: "live",
          cancelled: false,
          skipping: false,
          wait: async () => {
            // The board overlays every hold; queued holds must agree with the active one.
            for (const strip of held().values())
              observed.push({
                stack: strip.permanent.stack.map((card) => card.cardId),
                top: strip.permanent.topCard.cardId,
              });
          },
        });
      expect(observed).toEqual([
        { stack: ["ST20-06", "ST21-08"], top: "AD1-025" },
        { stack: ["ST20-06", "ST21-08"], top: "AD1-025" },
        { stack: ["ST20-06"], top: kind === "tops" ? "ST21-08" : "AD1-025" },
      ]);
      expect(held().size).toBe(0);
    },
  );
  it("serializes removals from different hosts using the real queue", async () => {
    const { steps, bursts } = collect(
      [deDigivolved, { ...deDigivolved, strippedStackTops: { permanentId: "perm-2", reason: "deDigivolve" } }],
      [],
      { ...anchors, permanentCenter: () => ({ x: 200, y: 300 }) },
    );
    const queue = createAnimationQueue();
    let release!: () => void;
    const firstWait = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const active: number[] = [];
    steps.forEach((step, index) =>
      queue.enqueue({
        ...step,
        run: (context) =>
          step.run({
            ...context,
            wait: async () => {
              active.push(bursts().length);
              if (index === 0) {
                started();
                await firstWait;
              }
            },
          }),
      }),
    );
    await firstStarted;
    expect(bursts().map((burst) => burst.key)).toEqual([1]);
    release();
    await queue.idle();
    expect(active).toEqual([1, 1]);
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
