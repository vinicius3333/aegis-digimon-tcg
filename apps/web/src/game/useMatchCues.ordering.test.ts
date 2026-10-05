// @vitest-environment jsdom

import { act, cleanup, render as renderDom, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import { recordSnapshot, type StateSnapshot } from "../net/presentedState";
import { TIMINGS } from "./timings";
import { NarrationStack } from "./NarrationStack";
import { I18nProvider } from "../i18n";
import { CardOpenerProvider } from "./cardLinks";

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

interface OrderingProps {
  batches: readonly ServerBatch[];
  decisionPending: boolean;
  state: GameState;
  snapshots: readonly StateSnapshot[];
}

function renderOrderingCues(initialState: GameState = BOARD) {
  const feed = batchFeed();
  let snapshots = recordSnapshot([], initialState);
  const view = renderHook(
    ({ batches, decisionPending, state, snapshots: taken }: OrderingProps) =>
      useMatchCues({
        narrationLimit: 3,
        batches,
        state,
        snapshots: taken,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        decisionPending,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    {
      initialProps: {
        batches: [],
        decisionPending: false,
        state: initialState,
        snapshots,
      } as OrderingProps,
    },
  );
  let pending = false;
  let board = initialState;
  const render = (batches: readonly ServerBatch[]) =>
    view.rerender({ batches, decisionPending: pending, state: board, snapshots });
  const takeBoard = (nextState: GameState) => {
    board = nextState;
    snapshots = recordSnapshot(snapshots, board);
  };
  return {
    ...view,
    feedBatch: (fresh: readonly ServerEvent[], nextState: GameState = board) => {
      takeBoard(nextState);
      render(feed(fresh));
    },
    feedBatches: (freshBatches: readonly (readonly ServerEvent[])[], nextState: GameState = board) => {
      takeBoard(nextState);
      let batches: readonly ServerBatch[] = [];
      for (const fresh of freshBatches) batches = feed(fresh);
      render(batches);
    },
    setDecisionPending: (value: boolean) => {
      pending = value;
      render(feed([]));
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

describe("Seventh Fascination's end-turn deletion and Lilithmon's reaction", () => {
  it("shows the granted clause, then deletion, then Lilithmon before security breaks", async () => {
    const before = {
      players: [
        {
          battleArea: [
            { permanentId: "perm-3", topCard: { instanceId: "lilith", cardId: "EX7-061" }, stack: [] },
            { permanentId: "perm-asuna", topCard: { instanceId: "asuna", cardId: "BT24-088" }, stack: [] },
          ],
          trash: [],
          hand: [],
          securityCount: 5,
        },
        {
          battleArea: [{ permanentId: "perm-1", topCard: { instanceId: "target", cardId: "BT1-009" }, stack: [] }],
          trash: [],
          hand: [],
          securityCount: 5,
        },
      ],
    } as unknown as GameState;
    const after = {
      players: [
        before.players[0],
        {
          battleArea: [],
          trash: [
            { instanceId: "target", cardId: "BT1-009" },
            { instanceId: "top", cardId: "BT1-020" },
          ],
          hand: [],
          securityCount: 4,
        },
      ],
    } as unknown as GameState;
    const view = renderOrderingCues(before);
    await advance(0);
    // The live arena closes these as separate batches. Asuna's earlier [On Play]
    // uses centerStage; that track was still pending when Lilithmon's reaction
    // arrived and a later shield break replaced it.
    const events: ServerEvent[] = [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT24-088",
        sourceInstanceId: "asuna",
        sourcePermanentId: "perm-asuna",
        effectKey: "asuna-on-play",
        description: "[On Play] Draw 2",
        timing: "OnPlay",
      },
      {
        kind: "effectTriggered",
        seat: 1,
        sourceCardId: "BT1-009",
        sourceInstanceId: "target",
        sourcePermanentId: "perm-1",
        effectKey: "grant",
        description: "[Granted] [End of Your Turn] Delete 1 of your Digimon.",
        timing: "endOfTurn",
      },
      {
        kind: "cardsMoved",
        from: "battleArea",
        to: "trash",
        instanceIds: ["target"],
        deletedPermanents: [{ permanentId: "perm-1", instanceId: "target", cardId: "BT1-009", seat: 1 }],
      },
      {
        kind: "effectResolved",
        seat: 1,
        sourceCardId: "BT1-009",
        effectKey: "grant",
        description: "[Granted] [End of Your Turn] Delete 1 of your Digimon.",
        timing: "endOfTurn",
      },
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX7-061",
        sourceInstanceId: "lilith",
        sourcePermanentId: "perm-3",
        effectKey: "reaction",
        description:
          "[All Turns] [Once Per Turn] When another Digimon is deleted, if it's your turn, you may play 1 purple level 4 or lower Digimon card from your trash without paying the cost. If it's your opponent's turn, trash the top card of their security stack.",
        timing: "onDeletionOf",
        printedTiming: "AllTurns",
      },
      { kind: "cardsMoved", from: "security", to: "trash", seat: 1, instanceIds: ["top"], cardIds: ["BT1-020"] },
      {
        kind: "effectResolved",
        seat: 0,
        sourceCardId: "EX7-061",
        effectKey: "reaction",
        description: "Lilithmon reaction",
        timing: "onDeletionOf",
      },
    ];
    view.feedBatches(
      events.map((event) => [event]),
      after,
    );
    const narrationView = () =>
      createElement(
        I18nProvider,
        null,
        createElement(
          CardOpenerProvider,
          null,
          createElement(NarrationStack, {
            narration: view.result.current.narration,
            rejection: null,
            onAdvance: () => undefined,
            onDismissRejection: () => undefined,
          }),
        ),
      );
    const dom = renderDom(narrationView());
    const visibleToastFor = (cardName: string, clause: string) => () => {
      dom.rerender(narrationView());
      return [...dom.container.querySelectorAll(".match-notice-stack")].some(
        (node) => node.textContent?.includes(cardName) && node.textContent?.includes(clause),
      );
    };
    const order = await firstSeenOrder(
      {
        grantToast: visibleToastFor("Monodramon", "Delete 1 of your Digimon"),
        deletion: () => view.result.current.deleteBursts.length > 0,
        lilithToast: visibleToastFor("Lilithmon (X Antibody)", "trash the top card of their security stack"),
        securityBreak: () => view.result.current.securityBreak !== null,
      },
      6000,
    );
    expect(order).toEqual(["grantToast", "deletion", "lilithToast", "securityBreak"]);
  });
});

describe("an effect plays a token onto the viewer's own field", () => {
  const TOKEN_PERMANENT = "perm-token";
  const TOKEN_BATCH: ServerEvent[] = [
    {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "AD1-002",
      sourceInstanceId: "s0-27",
      sourcePermanentId: "perm-3",
      effectKey: "AD1-002/ir-7-0",
      description: "[OnPlay] Play 1 Fujitsumon Token",
      timing: "OnPlay",
    },
    {
      kind: "cardPlayed",
      seat: 0,
      cardId: "TOKEN-Fujitsumon-Token",
      permanentId: TOKEN_PERMANENT,
    },
  ] as ServerEvent[];

  function boardWithToken(): GameState {
    const board = structuredClone(BOARD) as GameState;
    board.players[0]!.battleArea.push({
      permanentId: TOKEN_PERMANENT,
      topCard: { instanceId: "tok-1", cardId: "TOKEN-Fujitsumon-Token" },
      stack: [],
      currentDP: 3000,
    } as unknown as (typeof board.players)[0]["battleArea"][number]);
    return board;
  }

  it("holds the token off the field until the toast that made it is up", async () => {
    const view = renderOrderingCues();
    await advance(0);
    view.feedBatch(TOKEN_BATCH, boardWithToken());
    await advance(16);
    const order = await firstSeenOrder(
      {
        toast: () =>
          view.result.current.notices.some(
            (notice) => notice.body.variant === "effect" && notice.body.cardId === "AD1-002",
          ),
        token: () => !view.result.current.pendingPermanentIds.has(TOKEN_PERMANENT),
      },
      4000,
    );
    expect(order).toEqual(["toast", "token"]);
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

  function boardAt(stateVersion: number, { attacker = true }: { attacker?: boolean } = {}): GameState {
    const board = structuredClone(BOARD);
    board.stateVersion = stateVersion;
    if (!attacker) {
      const [dying] = board.players[0]!.battleArea.splice(0);
      if (dying) board.players[0]!.trash.push(dying.topCard);
    }
    return board;
  }

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

  it("keeps the attacker on the field when its whole check lands in one patch", async () => {
    const view = renderOrderingCues(boardAt(1));
    await advance(0);
    view.feedBatches([[ATTACK], [REVEAL], [ATTACKER_TRASHED], [CHECKED]], boardAt(2, { attacker: false }));
    await advance(16);
    const held = view.result.current.heldBlowState?.players[VIEWER];
    expect(held?.battleArea.map((permanent) => permanent.permanentId)).toContain("perm-3");
    expect(held?.battleArea.find((permanent) => permanent.permanentId === "perm-3")?.isSuspended).toBe(true);
    expect(held?.trash.map((card) => card.instanceId)).not.toContain("s0-27");
  });

  it("shatters the first attacker when the next check is staged before its outcome", async () => {
    const SECOND_ATTACK: ServerEvent = { ...ATTACK, attackerPermanentId: "perm-4", attackerCardId: "BT18-015" };
    const SECOND_REVEAL: ServerEvent = {
      ...REVEAL,
      revealedCardId: "BT21-013",
      artId: "BT21-013",
      attackerPermanentId: "perm-4",
      attackerArtId: "BT18-015",
    };
    const view = renderOrderingCues();
    await advance(0);
    for (const batch of [[ATTACK], [REVEAL], [ATTACKER_TRASHED]]) {
      view.feedBatch(batch as ServerEvent[]);
      await advance(16);
    }
    // The next attack's reveal reaches the client before the first check's outcome does,
    // which is what retires the first check's blow.
    view.feedBatch([SECOND_ATTACK, SECOND_REVEAL]);
    await advance(16);
    view.feedBatch([CHECKED]);
    const order = await firstSeenOrder(
      { shatter: () => view.result.current.deleteBursts.length > 0 },
      TIMINGS.securityDockMax / 4,
    );
    expect(order).toEqual(["shatter"]);
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

describe("BeelStarmon's [When Attacking] clauses read before the security check deletes it (Discord 1555578375677018193)", () => {
  it("shows the unsuspend and Hurricane Screw Shot toasts before the security break and BeelStarmon's shatter", async () => {
    const before = {
      players: [
        {
          battleArea: [
            {
              permanentId: "perm-3",
              topCard: { instanceId: "beel", cardId: "BT25-085" },
              stack: [
                { instanceId: "shot", cardId: "EX7-071" },
                { instanceId: "base", cardId: "BT10-012" },
              ],
            },
          ],
          trash: [],
          hand: [],
          securityCount: 5,
        },
        {
          battleArea: [{ permanentId: "perm-1", topCard: { instanceId: "target", cardId: "BT1-009" }, stack: [] }],
          trash: [],
          hand: [],
          securityCount: 5,
        },
      ],
    } as unknown as GameState;
    const after = {
      players: [
        {
          battleArea: [],
          trash: [
            { instanceId: "shot", cardId: "EX7-071" },
            { instanceId: "base", cardId: "BT10-012" },
            { instanceId: "beel", cardId: "BT25-085" },
          ],
          hand: [],
          securityCount: 5,
        },
        { battleArea: [], trash: [{ instanceId: "target", cardId: "BT1-009" }], hand: [], securityCount: 4 },
      ],
    } as unknown as GameState;
    const useOption =
      "[When Digivolving] [When Attacking] [Once Per Turn] You may use 1 [Three Musketeers] or [TS] trait Option card from your hand or this Digimon's digivolution cards without paying the cost.";
    const unsuspend =
      "[When Digivolving] [When Attacking] [Counter] [Once Per Turn] By trashing 1 Option card from any of your Digimon's digivolution cards or link cards, this Digimon unsuspends.";
    const beelEffect = (kind: "effectTriggered" | "effectResolved", effectKey: string, description: string) =>
      ({
        kind,
        seat: 0,
        sourceCardId: "BT25-085",
        sourceInstanceId: "beel",
        sourcePermanentId: "perm-3",
        effectKey,
        description,
        timing: "WhenAttacking",
      }) as ServerEvent;
    const screwShot = (kind: "effectTriggered" | "effectResolved") =>
      ({
        kind,
        seat: 0,
        sourceCardId: "EX7-071",
        sourceInstanceId: "shot",
        effectKey: "subtrigger/18/onDigivolutionCardDiscarded",
        description: "onDigivolutionCardDiscarded",
        timing: "onDigivolutionCardDiscarded",
        printedTiming: "Static",
        isInherited: true,
      }) as ServerEvent;
    // The live board names the attacker's card; the security scene needs it to hold the attacker.
    anchors.permanentCardId = (permanentId) => (permanentId === "perm-3" ? "BT25-085" : undefined);
    onTestFinished(() => {
      delete anchors.permanentCardId;
    });
    const view = renderOrderingCues(before);
    await advance(0);
    view.feedBatches([
      [
        {
          kind: "attackDeclared",
          seat: 0,
          attackerPermanentId: "perm-3",
          attackerCardId: "BT25-085",
          target: { kind: "player" },
        },
      ],
      [beelEffect("effectTriggered", "BT25-085/ir-shared-0", useOption)],
    ]);
    await advance(2000);
    // Everything after the Option choice reaches the client in one patch, as in the reported match.
    const screwShotMain = (kind: "effectTriggered" | "effectResolved") =>
      ({
        kind,
        seat: 0,
        sourceCardId: "EX7-071",
        sourceInstanceId: "shot",
        effectKey: "EX7-071/main",
        description: "[Main] Delete 1 of your opponent's level 3 Digimon.",
        timing: "OnUseOption",
        ...(kind === "effectTriggered" ? { printedTiming: "Main" } : {}),
      }) as ServerEvent;
    view.feedBatches(
      [
        [{ kind: "cardPlayed", seat: 0, cardId: "EX7-071" }],
        [screwShotMain("effectTriggered")],
        [
          {
            kind: "cardsMoved",
            instanceIds: ["target"],
            from: "battleArea",
            to: "trash",
            deletedPermanents: [{ permanentId: "perm-1", instanceId: "target", cardId: "BT1-009", seat: 1 }],
          },
        ],
        [
          {
            kind: "cardsMoved",
            instanceIds: ["shot"],
            from: "various",
            to: "battleArea",
            optionUsed: true,
            placedUnder: { permanentId: "perm-3" },
          },
        ],
        [screwShotMain("effectResolved")],
        [beelEffect("effectResolved", "BT25-085/ir-shared-0", useOption)],
        [beelEffect("effectTriggered", "BT25-085/ir-shared-1", unsuspend)],
        [{ kind: "cardsMoved", instanceIds: ["shot"], from: "various", to: "trash" }],
        [{ kind: "cardsMoved", instanceIds: ["perm-3"], from: "suspended", to: "unsuspended" }],
        [beelEffect("effectResolved", "BT25-085/ir-shared-1", unsuspend)],
        [screwShot("effectTriggered"), { kind: "memoryChanged", from: 5, to: 6, reason: "gainMemory" }],
        [screwShot("effectResolved")],
        [
          {
            kind: "securityRevealed",
            seat: 1,
            revealedCardId: "BT1-010",
            attackerPermanentId: "perm-3",
            isDigimon: true,
          },
        ],
        [
          {
            kind: "cardsMoved",
            instanceIds: ["base", "beel"],
            from: "battleArea",
            to: "trash",
            deletedPermanents: [{ permanentId: "perm-3", instanceId: "beel", cardId: "BT25-085", seat: 0 }],
          },
          { kind: "securityChecked", seat: 1, revealedCardId: "BT1-010", resolution: "battle" },
        ],
      ] as ServerEvent[][],
      after,
    );
    let monodramonHeldAtBreak: boolean | undefined;
    let beelStarmonAtBreak: { isSuspended: boolean; stack: { instanceId: string }[] } | undefined;
    let optionWasDocked = false;
    let shotHeldWhileDocked: boolean | undefined;
    let shotHeldAtUnsuspend: boolean | undefined;
    const shotHeld = () =>
      [...view.result.current.heldTrashArrivals.values()].some((arrival) => arrival.instanceIds.includes("shot"));
    const order = await firstSeenOrder(
      {
        optionDocked: () => {
          optionWasDocked ||= view.result.current.optionBranch !== null;
          if (optionWasDocked) shotHeldWhileDocked ??= shotHeld();
          return optionWasDocked;
        },
        monodramonShatter: () => view.result.current.deleteBursts.some((burst) => burst.cardId === "BT1-009"),
        optionLeft: () => optionWasDocked && view.result.current.optionBranch === null,
        unsuspendToast: () => {
          const shown = view.result.current.notices.some(
            (notice) =>
              notice.body.variant === "effect" &&
              notice.body.cardId === "BT25-085" &&
              (notice.body.description ?? "").includes("this Digimon unsuspends"),
          );
          if (shown) shotHeldAtUnsuspend ??= shotHeld();
          return shown;
        },
        screwShotToast: () =>
          view.result.current.notices.some(
            (notice) =>
              notice.body.variant === "effect" &&
              notice.body.cardId === "EX7-071" &&
              !(notice.body.description ?? "").startsWith("[Main]"),
          ),
        securityBreak: () => {
          if (view.result.current.securityBreak === null) return false;
          monodramonHeldAtBreak ??= view.result.current.heldBlowState?.players[1]?.battleArea.some(
            (permanent) => permanent.permanentId === "perm-1",
          );
          beelStarmonAtBreak ??= view.result.current.heldBlowState?.players[0]?.battleArea.find(
            (permanent) => permanent.permanentId === "perm-3",
          ) as unknown as typeof beelStarmonAtBreak;
          return true;
        },
        beelShatter: () => view.result.current.deleteBursts.some((burst) => burst.cardId === "BT25-085"),
      },
      15000,
    );
    expect(order).toEqual([
      "optionDocked",
      "monodramonShatter",
      "optionLeft",
      "unsuspendToast",
      "screwShotToast",
      "securityBreak",
      "beelShatter",
    ]);
    expect(monodramonHeldAtBreak).not.toBe(true);
    // Hurricane Screw Shot reaches the trash with the unsuspend cost, not when it is used.
    expect(shotHeldWhileDocked).toBe(true);
    expect(shotHeldAtUnsuspend).toBe(false);
    // The unsuspend paid for with Hurricane Screw Shot is on screen before the battle.
    expect(beelStarmonAtBreak?.isSuspended).toBe(false);
    expect(beelStarmonAtBreak?.stack.map((card) => card.instanceId)).toEqual(["base"]);
  });
});

describe("a ＜Delay＞ Option paying its cost", () => {
  const guardian = {
    seat: 0,
    sourceCardId: "BT20-100",
    sourceInstanceId: "guardian",
    sourcePermanentId: "perm-3",
    effectKey: "BT20-100/ir-1-0/action-0",
    description:
      "[All Turns] When any of your Digimon with [Omnimon] in its name would leave the battle area, ＜Delay＞",
    timing: "AllTurns",
  } as const;
  const guardianBoard = {
    players: [
      {
        battleArea: [
          { permanentId: "perm-3", topCard: { instanceId: "guardian", cardId: "BT20-100" }, stack: [], currentDP: 0 },
        ],
        trash: [],
        hand: [],
      },
      {
        ...BOARD.players[1],
        battleArea: [
          ...BOARD.players[1]!.battleArea,
          { permanentId: "perm-7", topCard: { instanceId: "s1-30", cardId: "BT1-009" }, stack: [], currentDP: 3000 },
        ],
      },
    ],
  } as unknown as GameState;
  const afterWipe = {
    players: [
      { battleArea: [], trash: [{ instanceId: "guardian", cardId: "BT20-100" }], hand: [] },
      { battleArea: [], trash: [], hand: [] },
    ],
  } as unknown as GameState;
  // The server sends each of these in a batch of its own, as it did in match f1c49980.
  const delayThenWipe: ServerEvent[][] = [
    [{ kind: "effectTriggered", ...guardian }],
    [
      {
        kind: "cardsMoved",
        instanceIds: ["guardian"],
        from: "various",
        to: "trash",
        trashedPermanents: [{ permanentId: "perm-3", instanceId: "guardian", cardId: "BT20-100", seat: 0 }],
      },
    ],
    [{ kind: "effectResolved", ...guardian }],
    [{ kind: "deletionPrevented", keyword: "Delay", seat: 0, permanentId: "perm-9", cardId: "BT20-102" }],
    [
      {
        kind: "cardsMoved",
        instanceIds: ["s1-51", "s1-17"],
        from: "battleArea",
        to: "trash",
        deletedPermanents: [{ permanentId: "perm-1", instanceId: "s1-17", cardId: "BT18-015", seat: 1 }],
      },
    ],
    [
      {
        kind: "cardsMoved",
        instanceIds: ["s1-30"],
        from: "various",
        to: "deckBottom",
        seat: 1,
        returnedPermanents: [{ permanentId: "perm-7", instanceId: "s1-30", cardId: "BT1-009", seat: 1 }],
      },
    ],
  ];

  it("takes the Option, then each opponent Digimon, off the field one at a time (Discord 1555673696960774224)", async () => {
    const view = renderOrderingCues(guardianBoard);
    await advance(0);
    view.feedBatches(delayThenWipe, afterWipe);
    const seenAt: Record<string, number> = {};
    const at = (name: string, shown: boolean) => {
      if (shown) seenAt[name] ??= Date.now();
      return shown;
    };
    await firstSeenOrder(
      {
        clause: () =>
          at(
            "clause",
            view.result.current.notices.some(
              (notice) => notice.body.variant === "effect" && notice.body.cardId === "BT20-100",
            ),
          ),
        optionBreak: () =>
          at(
            "optionBreak",
            view.result.current.deleteBursts.some((burst) => burst.cardId === "BT20-100"),
          ),
        opponentBreak: () =>
          at(
            "opponentBreak",
            view.result.current.deleteBursts.some((burst) => burst.cardId === "BT18-015"),
          ),
        returnLeaves: () =>
          at(
            "returnLeaves",
            seenAt.opponentBreak !== undefined &&
              ![...view.result.current.heldDeletions.values()].some((held) => held.permanent.permanentId === "perm-7"),
          ),
      },
      8000,
    );
    const probeStepMs = 16;
    expect(seenAt.opponentBreak! - seenAt.optionBreak!).toBeGreaterThanOrEqual(TIMINGS.removalStagger - probeStepMs);
    expect(seenAt.returnLeaves! - seenAt.opponentBreak!).toBeGreaterThanOrEqual(TIMINGS.removalStagger - probeStepMs);
    // The Option breaks as its clause is read, with no reading beat in between.
    expect(seenAt.optionBreak! - seenAt.clause!).toBeLessThan(TIMINGS.effectAnnounce);
    expect(
      view.result.current.notices.some(
        (notice) => notice.body.variant === "keyword" && notice.body.cardId === "BT20-102",
      ),
    ).toBe(false);
  });
});

it("presents the resolving clause, its public target, then the opponent's leave protection", async () => {
  vi.useFakeTimers();
  const view = renderOrderingCues();
  view.feedBatch([
    {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "AD1-002",
      sourcePermanentId: "perm-3",
      sourceInstanceId: "s0-27",
      effectKey: "on-play",
      timing: "OnPlay",
      description: "Delete 1 of your opponent's Digimon.",
    },
    { kind: "effectTargetsSelected", seat: 0, sourcePermanentId: "perm-3", targetPermanentIds: ["perm-1"] },
    {
      kind: "effectTriggered",
      seat: 1,
      sourceCardId: "BT18-015",
      sourcePermanentId: "perm-1",
      sourceInstanceId: "s1-17",
      effectKey: "protection",
      timing: "AllTurns",
      beforeRemoval: true,
      description: "When this Digimon would leave, it doesn't leave.",
    },
  ]);
  const order = await firstSeenOrder(
    {
      onPlay: () =>
        view.result.current.notices.some(
          (notice) => notice.body.variant === "effect" && notice.body.timing === "OnPlay",
        ),
      target: () => view.result.current.effectSources.some((source) => source.targetPermanentIds?.includes("perm-1")),
      protection: () =>
        view.result.current.notices.some(
          (notice) => notice.body.variant === "effect" && notice.body.timing === "AllTurns",
        ),
    },
    6000,
  );
  expect(order).toEqual(["onPlay", "target", "protection"]);
});

it.each([0, 1] as const)(
  "does not cycle when interrupted source on seat %s is deleted later in the same batch",
  async (deletedSeat) => {
    vi.useFakeTimers();
    const { observeGateExpiry } = await import("./match/presentationGate");
    const expiries: string[] = [];
    const stop = observeGateExpiry(({ label }) => expiries.push(label));
    onTestFinished(stop);
    const view = renderOrderingCues();
    const after = structuredClone(BOARD);
    after.players[deletedSeat]!.battleArea.splice(0);
    view.feedBatch(
      [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "AD1-002",
          sourcePermanentId: "perm-3",
          sourceInstanceId: "s0-27",
          effectKey: "on-play",
          timing: "OnPlay",
          description: "Delete 1 of your opponent's Digimon.",
        },
        { kind: "effectTargetsSelected", seat: 0, sourcePermanentId: "perm-3", targetPermanentIds: ["perm-1"] },
        {
          kind: "effectTriggered",
          seat: 1,
          sourceCardId: "BT18-015",
          sourcePermanentId: "perm-1",
          sourceInstanceId: "s1-17",
          effectKey: "protection",
          timing: "AllTurns",
          beforeRemoval: true,
          description: "When this Digimon would leave, by deleting 1 Digimon, it doesn't leave.",
        },
        { kind: "effectTargetsSelected", seat: 1, sourcePermanentId: "perm-1", targetPermanentIds: ["perm-3"] },
        {
          kind: "cardsMoved",
          instanceIds: deletedSeat === 1 ? ["s1-51", "s1-17"] : ["s0-27"],
          from: "battleArea",
          to: "trash",
          deletedPermanents: [
            deletedSeat === 1
              ? { permanentId: "perm-1", instanceId: "s1-17", cardId: "BT18-015", seat: 1 }
              : { permanentId: "perm-3", instanceId: "s0-27", cardId: "AD1-002", seat: 0 },
          ],
        },
      ],
      after,
    );
    await advance(12_000);
    expect(expiries).toEqual([]);
  },
);
