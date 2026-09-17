// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { TIMINGS } from "./timings";

vi.mock("../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

const VIEWER = 0;

const BOARD = {
  players: [
    {
      battleArea: [
        {
          permanentId: "perm-3",
          topCard: { instanceId: "s0-27", cardId: "AD1-002" },
          stack: [],
          currentDP: 12000,
        },
      ],
      trash: [],
      hand: [],
    },
    {
      battleArea: [
        {
          permanentId: "perm-1",
          topCard: { instanceId: "s1-17", cardId: "BT18-015" },
          stack: [{ instanceId: "s1-51", cardId: "BT15-006" }],
          currentDP: 5000,
        },
      ],
      trash: [],
      hand: [],
    },
  ],
} as unknown as GameState;

const anchors: MatchCueAnchors = {
  board: { current: null },
  permanentCenter: (permanentId) =>
    permanentId === "perm-1" || permanentId === "perm-3" ? { x: 120, y: 80 } : undefined,
  yourDeck: { current: null },
  oppDeck: { current: null },
  yourHandDock: { current: null },
  oppHandStrip: { current: null },
  yourSecurity: { current: null },
  oppSecurity: { current: null },
};

function batchFeed(): (fresh: readonly ServerEvent[]) => readonly ServerBatch[] {
  let version = 0;
  let batches: readonly ServerBatch[] = [];
  return (fresh) => {
    if (fresh.length > 0) batches = [...batches, singleServerBatch(fresh, (version += 1))];
    return batches;
  };
}

function renderOrderingCues(initialState: GameState | undefined = BOARD) {
  const feed = batchFeed();
  const view = renderHook(
    ({
      batches,
      decisionPending,
      state,
    }: {
      batches: readonly ServerBatch[];
      decisionPending: boolean;
      state: GameState | undefined;
    }) =>
      useMatchCues({
        narrationLimit: 3,
        batches,
        state,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        decisionPending,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: { batches: [] as readonly ServerBatch[], decisionPending: false, state: initialState } },
  );
  let pending = false;
  let board = initialState;
  return {
    ...view,
    feedBatch: (fresh: readonly ServerEvent[], nextState: GameState | undefined = board) => {
      board = nextState;
      view.rerender({ batches: feed(fresh), decisionPending: pending, state: board });
    },
    setDecisionPending: (value: boolean) => {
      pending = value;
      view.rerender({ batches: feed([]), decisionPending: value, state: board });
    },
  };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function firstSeenOrder(probes: Record<string, () => boolean>, totalMs: number): Promise<readonly string[]> {
  const seen: string[] = [];
  for (let elapsed = 0; elapsed <= totalMs; elapsed += 16) {
    for (const [name, probe] of Object.entries(probes)) if (!seen.includes(name) && probe()) seen.push(name);
    await advance(16);
  }
  return seen;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("an effect's consequences follow the toast that names it", () => {
  const batches: ServerEvent[][] = [];
  const push = (...batch: ServerEvent[]) => {
    batches.push(batch);
  };
  push(
    { kind: "cardsMoved", instanceIds: ["s0-27"], from: "hand", to: "battleArea" },
    { kind: "digivolved", seat: 0, permanentId: "perm-3", cardId: "AD1-002", mechanic: "normal", inBreeding: false },
  );
  push({
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "AD1-002",
    sourceInstanceId: "s0-27",
    sourcePermanentId: "perm-3",
    effectKey: "AD1-002/ir-7-0",
    description: "[WhenDigivolving] Delete 1 target(s)",
    timing: "WhenDigivolving",
  });
  push({
    kind: "cardsMoved",
    instanceIds: ["s1-51", "s1-17"],
    from: "battleArea",
    to: "trash",
    deletedPermanents: [{ permanentId: "perm-1", instanceId: "s1-17", cardId: "BT18-015", seat: 1 }],
  });
  push({
    kind: "effectResolved",
    seat: 0,
    sourceCardId: "AD1-002",
    sourceInstanceId: "s0-27",
    sourcePermanentId: "perm-3",
    effectKey: "AD1-002/ir-7-0",
    description: "[WhenDigivolving] Delete 1 target(s)",
    timing: "WhenDigivolving",
  });
  push({
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "BT15-006",
    sourceInstanceId: "s1-51",
    effectKey: "BT15-006/ir-11-0",
    description: "[OnDeletion] Draw 2",
    timing: "OnDestroyedAnyone",
    isInherited: true,
  });

  it("shows the [When Digivolving] toast before the shatter and the victim's own toast", async () => {
    const view = renderOrderingCues();
    await advance(0);
    for (const batch of batches) {
      view.feedBatch(batch);
      await advance(16);
    }
    const noticeFor = (cardId: string) => () =>
      view.result.current.notices.some((notice) => notice.body.variant === "effect" && notice.body.cardId === cardId);
    const order = await firstSeenOrder(
      {
        announce: noticeFor("AD1-002"),
        shatter: () => view.result.current.deleteBursts.length > 0,
        victimToast: noticeFor("BT15-006"),
      },
      4000,
    );
    expect(order[0]).toBe("announce");
    expect(order).toContain("shatter");
    expect(order).toContain("victimToast");
  });
});

const ONE_BATCH: ServerEvent[] = [
  { kind: "cardsMoved", instanceIds: ["s0-27"], from: "hand", to: "battleArea" },
  { kind: "digivolved", seat: 0, permanentId: "perm-3", cardId: "AD1-002", mechanic: "normal", inBreeding: false },
  {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "AD1-002",
    sourceInstanceId: "s0-27",
    sourcePermanentId: "perm-3",
    effectKey: "AD1-002/ir-7-0",
    description: "[WhenDigivolving] Delete 1 target(s)",
    timing: "WhenDigivolving",
  },
  {
    kind: "cardsMoved",
    instanceIds: ["s1-51", "s1-17"],
    from: "battleArea",
    to: "trash",
    deletedPermanents: [{ permanentId: "perm-1", instanceId: "s1-17", cardId: "BT18-015", seat: 1 }],
  },
  {
    kind: "effectResolved",
    seat: 0,
    sourceCardId: "AD1-002",
    sourceInstanceId: "s0-27",
    sourcePermanentId: "perm-3",
    effectKey: "AD1-002/ir-7-0",
    description: "[WhenDigivolving] Delete 1 target(s)",
    timing: "WhenDigivolving",
  },
] as ServerEvent[];

const FREEZE_BATCH: ServerEvent[] = [
  {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "AD1-002",
    sourceInstanceId: "s0-27",
    sourcePermanentId: "perm-3",
    effectKey: "AD1-002/ir-9-0",
    description: "[WhenDigivolving] This Digimon can't attack",
    timing: "WhenDigivolving",
  },
] as ServerEvent[];

function frozenBoard(): GameState {
  const board = structuredClone(BOARD) as GameState;
  (board.players[1]!.battleArea[0] as unknown as { cannotAttack: boolean }).cannotAttack = true;
  return board;
}

describe("one batch carries a clause and what it deleted", () => {
  it("shows the toast before the shatter", async () => {
    const view = renderOrderingCues();
    await advance(0);
    view.feedBatch(ONE_BATCH);
    await advance(16);
    const order = await firstSeenOrder(
      {
        announce: () =>
          view.result.current.notices.some(
            (notice) => notice.body.variant === "effect" && notice.body.cardId === "AD1-002",
          ),
        shatter: () => view.result.current.deleteBursts.length > 0,
      },
      6000,
    );
    expect(order).toEqual(["announce", "shatter"]);
  });
});

describe("one batch carries a clause and the Digimon it locked down", () => {
  it("shows the toast before the jolt", async () => {
    const view = renderOrderingCues();
    await advance(0);
    view.feedBatch(FREEZE_BATCH, frozenBoard());
    await advance(16);
    const order = await firstSeenOrder(
      {
        announce: () =>
          view.result.current.notices.some(
            (notice) => notice.body.variant === "effect" && notice.body.cardId === "AD1-002",
          ),
        jolt: () => view.result.current.freezePulses.size > 0,
      },
      6000,
    );
    expect(order).toEqual(["announce", "jolt"]);
  });
});

describe("a security battle's outcome comes before the attacker's death", () => {
  const ATTACK: ServerEvent = {
    kind: "attackDeclared",
    seat: 0,
    attackerPermanentId: "perm-3",
    attackerCardId: "AD1-002",
    attackerArtId: "AD1-002",
    target: { kind: "player" },
  };
  const REVEAL: ServerEvent = {
    kind: "securityRevealed",
    seat: 1,
    revealedCardId: "BT18-019",
    artId: "BT18-019",
    attackerPermanentId: "perm-3",
    attackerArtId: "AD1-002",
    securityCardDP: 14000,
    attackerDP: 12000,
    hasSecurityEffect: false,
    isDigimon: true,
  };
  const ATTACKER_TRASHED: ServerEvent = {
    kind: "cardsMoved",
    instanceIds: ["s0-27"],
    from: "battleArea",
    to: "trash",
    deletedPermanents: [{ permanentId: "perm-3", instanceId: "s0-27", cardId: "AD1-002", seat: 0 }],
  };
  const CHECKED: ServerEvent = {
    kind: "securityChecked",
    seat: 1,
    revealedCardId: "BT18-019",
    artId: "BT18-019",
    resolution: "battle",
    battle: { securityDigimonDeleted: false, attackerDeleted: true, attackerDP: 12000, securityCardDP: 14000 },
  };
  const ON_DELETION: ServerEvent = {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "AD1-002",
    sourceInstanceId: "s0-27",
    effectKey: "AD1-002/ir-11-0",
    description: "[OnDeletion] Draw 2",
    timing: "OnDestroyedAnyone",
    duringSecurityCheck: true,
  };

  const settled = (view: ReturnType<typeof renderOrderingCues>) => () =>
    view.result.current.securityClash?.resolution === "battle";

  it("plays the outcome, then the shatter, then the [On Deletion] toast (new server order)", async () => {
    const view = renderOrderingCues();
    await advance(0);
    for (const batch of [[ATTACK], [REVEAL], [ATTACKER_TRASHED], [CHECKED], [ON_DELETION]]) {
      view.feedBatch(batch as ServerEvent[]);
      await advance(16);
    }
    const order = await firstSeenOrder(
      {
        outcome: settled(view),
        shatter: () => view.result.current.deleteBursts.length > 0,
        deathToast: () =>
          view.result.current.notices.some(
            (notice) => notice.body.variant === "effect" && notice.body.cardId === "AD1-002",
          ),
      },
      8000,
    );
    expect(order).toEqual(["outcome", "shatter", "deathToast"]);
  });

  it("keeps the shatter behind the outcome when the viewer fast-forwards", async () => {
    const view = renderOrderingCues();
    await advance(0);
    for (const batch of [[ATTACK], [REVEAL], [ATTACKER_TRASHED]]) {
      view.feedBatch(batch as ServerEvent[]);
      await advance(16);
    }
    act(() => view.result.current.skipAnimations());
    await advance(1000);
    expect(view.result.current.deleteBursts).toHaveLength(0);

    view.feedBatch([CHECKED]);
    await advance(2000);
    expect(view.result.current.heldBlowState).toBeUndefined();
    expect(view.result.current.securityClash).toBeNull();
    expect(view.result.current.deleteBursts).toHaveLength(0);
  });

  it("lets the clash go when the old server stops to ask the viewer something", async () => {
    const view = renderOrderingCues();
    await advance(0);
    view.feedBatch([ATTACK]);
    await advance(16);
    view.feedBatch([REVEAL]);
    await advance(16);
    view.feedBatch([ATTACKER_TRASHED, ON_DELETION]);
    await advance(16);
    view.setDecisionPending(true);

    await advance(TIMINGS.securityDockMax / 4);
    expect(view.result.current.securityClash).toBeNull();
    expect(view.result.current.securityRevealPending).toBe(false);
  });
});
