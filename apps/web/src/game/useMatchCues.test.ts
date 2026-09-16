// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardInstance, Permanent, Phase, type GameState, type ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { singleServerBatch, type ServerBatch } from "../net/serverBatches";
import {
  CLASH_OUTCOME_AT_MS,
  CLASH_DOCK_AT_MS,
  CLASH_DOCK_LEAVE_MS,
  CLASH_REVEAL_SHOWN_AT_MS,
  CLASH_TOTAL_MS,
  FIELD_CLASH_IMPACT_AT_MS,
  FIELD_CLASH_LUNGE_AT_MS,
  SECURITY_BRANCH_IN_MS,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_TOTAL_MS,
  SECURITY_DESTROY_OUTCOME_AT_MS,
  SECURITY_DESTROY_TOTAL_MS,
  SECURITY_DOCK_CLOSE_MS,
  PLAY_LEAD_IN_BUDGET_MS,
  SHOWCASE_TOTAL_MS,
  TIMINGS,
  CARD_BURST_PEAK_MS,
  COMBAT_IMPACT_TOTAL_MS,
  FIELD_CLASH_TOTAL_MS,
} from "./timings";
import { NARRATION_TICK_MS } from "./narration";
import { REJECTION_LIFETIME_MS } from "./notices";
import { SIDE_PANEL_LIFETIME_MS } from "./sidePanels";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import { PRESENTED_BOARD_BUDGET_MS } from "./presentationProgress";

/**
 * How long a narration item carrying a notice holds its slot, plus the tick the slot
 * takes to clear: advance by this and the queue has moved on to the next moment.
 */
const NOTICE_ITEM_MS = TIMINGS.noticeLifetime + NARRATION_TICK_MS;

/**
 * When a check that resolves an effect is finally allowed to speak: the shield break, the
 * whole centre-stage clash, and the slide that parks the revealed card at the side it reads
 * out from. Its notice and the decisions it asks for both land here.
 */
const EFFECT_CHECK_NOTICE_AT_MS = SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS + SECURITY_BRANCH_IN_MS;

/** When a reveal the server has not closed yet has finished putting its card on screen. */
const REVEAL_SHOWN_AT_MS = SECURITY_BREAK_TOTAL_MS + CLASH_OUTCOME_AT_MS;

/**
 * When that card has played out and left the centre of the screen. A check the server is
 * still resolving hands the board over here: its effects read out on a clear board.
 */
const REVEAL_EXIT_AT_MS = SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS;

/** When a card the server says has a [Security] effect leaves the centre for its dock. */
const DOCK_AT_MS = SECURITY_BREAK_TOTAL_MS + CLASH_DOCK_LEAVE_MS;

/** When it has arrived there, which is when what it did may be read out beside it. */
const DOCKED_AT_MS = DOCK_AT_MS + SECURITY_BRANCH_IN_MS;

const playSound = vi.hoisted(() => vi.fn<(kind: string) => void>());
vi.mock("../design/sound", () => ({ playSound }));

const VIEWER = 0;
const ATTACK: ServerEvent = {
  kind: "attackDeclared",
  seat: 1,
  attackerPermanentId: "perm-1",
  attackerCardId: "BT1-010",
  target: { kind: "player" },
};
const REVEAL: ServerEvent = {
  kind: "securityRevealed",
  seat: 0,
  revealedCardId: "BT1-010",
  attackerPermanentId: "perm-1",
};
const CHECK: ServerEvent = { kind: "securityChecked", seat: 0, revealedCardId: "BT1-010", resolution: "battle" };
const SECOND_CHECK: ServerEvent = { ...CHECK, revealedCardId: "BT1-011" };
const SECOND_REVEAL: ServerEvent = { ...REVEAL, revealedCardId: "BT1-011" };
const EFFECT_CHECK: ServerEvent = { ...CHECK, resolution: "effect" };
/** A reveal whose card the server says carries a [Security] effect it is about to resolve. */
const EFFECT_REVEAL: ServerEvent = { ...REVEAL, hasSecurityEffect: true };
const EFFECT_NOTICE: ServerEvent = {
  kind: "effectTriggered",
  seat: 0,
  sourceCardId: "BT1-010",
  effectKey: "security",
  description: "Draw 1.",
  timing: "Security",
};
const TURN_END: ServerEvent = { kind: "turnEnded", endingSeat: 1, nextSeat: 0, turnCount: 4 };
const COMBAT: ServerEvent = {
  kind: "combatResolved",
  seat: 1,
  attackerPermanentId: "perm-1",
  deletedPermanentIds: ["perm-dead"],
};
const UNSUSPEND_PHASE: ServerEvent = { kind: "phaseChanged", phase: "Active", turnSeat: 0, turnCount: 5 };
const OPP_PLAY: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-010", permanentId: "perm-9" };
const SHUFFLE: ServerEvent = { kind: "deckShuffled", seat: 1, deck: "eggDeck" };
const RETURN_TO_DECK: ServerEvent = {
  kind: "cardsMoved",
  instanceIds: ["i-1"],
  from: "hand",
  to: "deckBottom",
};
const YOUR_PLAY: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-011", permanentId: "perm-8" };
const OPTION_USE: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-090" };
const OPTION_ROUTED: ServerEvent = {
  kind: "cardsMoved",
  instanceIds: ["option-1"],
  from: "hand",
  to: "trash",
  optionUsed: true,
};

/* BT10-087 Taiki Kudo on the opponent's security stack: its [Security] clause plays it for
   free, and the [On Play] that follows reveals the top four cards of their deck. */
const OPP_EFFECT_REVEAL: ServerEvent = {
  kind: "securityRevealed",
  seat: 1,
  revealedCardId: "BT10-087",
  attackerPermanentId: "perm-1",
  hasSecurityEffect: true,
};
const OPP_SECURITY_NOTICE: ServerEvent = {
  kind: "effectTriggered",
  seat: 1,
  sourceCardId: "BT10-087",
  effectKey: "security",
  description: "Play this card without paying its cost.",
  timing: "Security",
};
const OPP_TAIKI_PLAY: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT10-087", permanentId: "perm-taiki" };
const YOUR_TAIKI_PLAY: ServerEvent = {
  kind: "cardPlayed",
  seat: 0,
  cardId: "BT10-087",
  permanentId: "perm-your-taiki",
};
const OPP_ON_PLAY: ServerEvent = {
  kind: "effectTriggered",
  seat: 1,
  sourceCardId: "BT10-087",
  effectKey: "onPlay",
  description: "Reveal the top 4 cards of your deck.",
  timing: "On Play",
};
const TAIKI_REVEALS: readonly ServerEvent[] = ["BT1-001", "BT1-002", "BT1-003", "BT1-004"].map((cardId) => ({
  kind: "cardRevealed",
  seat: 1,
  cardId,
  sourceCardId: "BT10-087",
}));

/** Nothing is laid out in jsdom, so a draw flight measures zero and never launches. */
const anchors: MatchCueAnchors = {
  board: { current: null },
  permanentCenter: (permanentId) => (permanentId === "perm-dead" ? { x: 120, y: 80 } : undefined),
  yourDeck: { current: null },
  oppDeck: { current: null },
  yourHandDock: { current: null },
  oppHandStrip: { current: null },
  yourSecurity: { current: null },
  oppSecurity: { current: null },
};

it("flies a face-down card from the deck to its Tamer and clears it after landing", async () => {
  const board = document.createElement("div");
  const deck = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 800, 600));
  vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(610, 420, 100, 140));
  const feed = batchFeed();
  const { result, rerender } = renderHook(
    ({ events }: { events: readonly ServerEvent[] }) =>
      useMatchCues({
        narrationLimit: 1,
        batches: feed(events),
        state: undefined,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        anchors: {
          ...anchors,
          board: { current: board },
          yourDeck: { current: deck },
          permanentCenter: (id) => (id === "tamer" ? { x: 200, y: 300 } : undefined),
        },
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: { events: [] as readonly ServerEvent[] } },
  );
  rerender({
    events: [
      {
        kind: "cardsMoved",
        from: "deck",
        to: "battleArea",
        instanceIds: ["hidden"],
        deckToUnder: { seat: 0, permanentId: "tamer", count: 1 },
      },
    ],
  });
  await advance(0);
  expect(result.current.drawFlights).toHaveLength(1);
  expect(result.current.drawFlights[0]).toMatchObject({ x: 650, y: 470, dx: -450, dy: -170 });
  await advance(result.current.drawFlights[0]!.duration);
  expect(result.current.drawFlights).toHaveLength(0);
});

it.each([0, 1] as const)(
  "presents seat %s's Option draw before the next turn ribbons when patches coalesce",
  async (seat) => {
    const board = document.createElement("div");
    const deck = document.createElement("div");
    const hand = document.createElement("div");
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
    vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
    vi.spyOn(hand, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 500, 300, 80));
    const state = {
      players: [0, 1].map(() => ({ hand: [], handCount: 5, battleArea: [], trash: [] })),
    } as unknown as GameState;
    const feed = batchFeed();
    const { result, rerender } = renderHook(
      (events: readonly ServerEvent[]) =>
        useMatchCues({
          batches: feed(events),
          phaseEvents: events,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors: {
            ...anchors,
            board: { current: board },
            yourDeck: { current: deck },
            yourHandDock: { current: hand },
            oppDeck: { current: deck },
            oppHandStrip: { current: hand },
          },
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: [] as readonly ServerEvent[] },
    );
    await advance(0);
    // The opponent's hand is concealed and may return to the same count after using an Option.
    state.players[seat]!.handCount = seat === 0 ? 6 : 5;
    rerender([
      { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: ["drawn-a", "drawn-b"], seat },
      { kind: "phaseChanged", phase: "End", turnSeat: 0, turnCount: 1 },
      { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 1 },
      { kind: "phaseChanged", phase: "Active", turnSeat: 1, turnCount: 2 },
      { kind: "phaseChanged", phase: "Draw", turnSeat: 1, turnCount: 2 },
      { kind: "phaseChanged", phase: "Breeding", turnSeat: 1, turnCount: 2 },
    ]);
    await advance(32);
    expect(result.current.drawFlights).toHaveLength(1);
    expect(result.current.phaseBanner).toBeNull();
    // One flight per drawn card: the server names a whole Draw 2 in a single event, and
    // a flight per event sent one card back for two cards.
    const flightMs = result.current.drawFlights[0]!.duration;
    await advance(TIMINGS.drawFlightStagger);
    expect(result.current.drawFlights).toHaveLength(2);
    // Both land first, and the burst then plays every ribbon it carries, in order.
    await advance(flightMs + 32);
    expect(result.current.drawFlights).toHaveLength(0);
    expect(result.current.phaseBanner?.phase).toBe("End");
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + 32);
    expect(result.current.turnTransition).not.toBeNull();
    await advance(TIMINGS.turnBanner + TIMINGS.phaseBannerGap + 32);
    expect(result.current.phaseBanner?.phase).toBe("Active");
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + 32);
    expect(result.current.phaseBanner?.phase).toBe("Draw");
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + 32);
    expect(result.current.phaseBanner?.phase).toBe("Breeding");
  },
);

it("finishes an effect-driven digivolution burst before flying its bonus draw", async () => {
  const board = document.createElement("div");
  const deck = document.createElement("div");
  const hand = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
  vi.spyOn(hand, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 500, 300, 80));
  const feed = batchFeed();
  const { result, rerender } = renderHook(
    (events: readonly ServerEvent[]) =>
      useMatchCues({
        batches: feed(events),
        state: undefined,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        anchors: {
          ...anchors,
          board: { current: board },
          yourDeck: { current: deck },
          yourHandDock: { current: hand },
        },
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: [] as readonly ServerEvent[] },
  );
  rerender([
    { kind: "digivolved", seat: 0, permanentId: "effect-evo", cardId: "EX12-036", mechanic: "normal" },
    { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: ["bonus"], seat: 0, drawReason: "digivolution" },
  ]);
  await advance(0);
  expect(result.current.permanentBursts.get("effect-evo")?.variant).toBe("evolve");
  expect(result.current.drawFlights).toHaveLength(0);
  await advance(CARD_BURST_PEAK_MS);
  expect(result.current.drawFlights).toHaveLength(1);
});

/**
 * Turns the cumulative event log a test writes into the server batches the hook consumes:
 * whatever is new since the previous render is one batch, which is the boundary the server
 * draws around one entry into the engine. A shorter log than before is a replaced log (a
 * new scenario), so the feed starts over.
 */
function batchFeed(): (cumulative: readonly ServerEvent[]) => readonly ServerBatch[] {
  let consumed = 0;
  let version = 0;
  let batches: readonly ServerBatch[] = [];
  return (cumulative: readonly ServerEvent[]) => {
    if (cumulative.length < consumed) {
      consumed = 0;
      version = 0;
      batches = [];
    }
    const fresh = cumulative.slice(consumed);
    consumed = cumulative.length;
    // Each batch closes at its own revision, exactly as the server bumps `stateVersion`
    // once per closed batch — the presentation reports which one it is reading out.
    if (fresh.length > 0) batches = [...batches, singleServerBatch(fresh, (version += 1))];
    return batches;
  };
}

function renderCues(
  initialEvents: readonly ServerEvent[] = [],
  onActionRejected = vi.fn<(reason: string) => void>(),
  rawPhases = false,
) {
  const feed = batchFeed();
  let latestEvents = initialEvents;
  const view = renderHook(
    (batches: readonly ServerBatch[]) =>
      useMatchCues({
        narrationLimit: 3,
        batches,
        phaseEvents: rawPhases ? latestEvents : undefined,
        state: undefined,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        anchors,
        onActionRejected,
      }),
    { initialProps: feed(initialEvents) },
  );
  return {
    ...view,
    rerender: (events: readonly ServerEvent[]) => {
      latestEvents = events;
      view.rerender(feed(events));
    },
    onActionRejected,
  };
}

/**
 * A board with two cards already in the opponent's trash, which is what lets the hook
 * name the cards a `cardsMoved` out of security refers to — the event carries instance
 * ids and no seat, and trash is public.
 */
const TRASHED_SECURITY_BOARD = {
  players: [
    { battleArea: [], trash: [], hand: [] },
    {
      battleArea: [],
      trash: [
        { instanceId: "sec-1", cardId: "BT1-010" },
        { instanceId: "sec-2", cardId: "BT1-011" },
      ],
      hand: [],
    },
  ],
} as unknown as GameState;

/** The same board, with a stack still showing the cards the events are about to spend. */
const STACKED_SECURITY_BOARD = {
  players: [
    { battleArea: [], trash: [], hand: [], securityCount: 5 },
    {
      battleArea: [],
      trash: [
        { instanceId: "sec-1", cardId: "BT1-010" },
        { instanceId: "sec-2", cardId: "BT1-011" },
      ],
      hand: [],
      securityCount: 5,
    },
  ],
} as unknown as GameState;

const SECURITY_TRASHED: ServerEvent = {
  kind: "cardsMoved",
  instanceIds: ["sec-1", "sec-2"],
  from: "security",
  to: "trash",
};

/** The same hook over a board, so movements the events name resolve to real cards. */
function renderCuesOverBoard(
  state: GameState,
  snapshots?: readonly StateSnapshot[],
  onPresentationReport?: (report: import("@aegis/shared").PresentationReport) => void,
) {
  const feed = batchFeed();
  const view = renderHook(
    (batches: readonly ServerBatch[]) =>
      useMatchCues({
        narrationLimit: 3,
        batches,
        state,
        snapshots,
        onPresentationReport,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: [] as readonly ServerBatch[] },
  );
  return { ...view, rerender: (events: readonly ServerEvent[]) => view.rerender(feed(events)) };
}

/** The same hook, with the question the server is waiting on as a second input. */
function renderCuesAwaitingAnswer() {
  const feed = batchFeed();
  const view = renderHook(
    ({
      batches,
      decisionPending,
      decisionStateVersion,
    }: {
      batches: readonly ServerBatch[];
      decisionPending: boolean;
      decisionStateVersion?: number;
    }) =>
      useMatchCues({
        narrationLimit: 3,
        batches,
        state: undefined,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        decisionPending,
        decisionStateVersion,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    {
      initialProps: {
        batches: [] as readonly ServerBatch[],
        decisionPending: false,
        decisionStateVersion: undefined as number | undefined,
      },
    },
  );
  return {
    ...view,
    rerender: ({
      events,
      decisionPending,
      decisionStateVersion,
    }: {
      events: readonly ServerEvent[];
      decisionPending: boolean;
      decisionStateVersion?: number;
    }) => view.rerender({ batches: feed(events), decisionPending, decisionStateVersion }),
  };
}

/** How often the hook's prerequisite waits re-check, so a cue can open a poll late. */
const POLL_MS = 16;

/** Lets the queue's promise chain run out under fake timers. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  playSound.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * What the server batch replaced: the boundary used to be "the events that arrived since the
 * last render", so two moments delivered together read as one, and one moment delivered in
 * two renders read as two. Both are now decided by the batch alone.
 */
describe("match cues grouped by server batch", () => {
  /** The hook fed batches directly, which is what a test about batch boundaries needs. */
  function renderCuesOnBatches() {
    return renderHook(
      (batches: readonly ServerBatch[]) =>
        useMatchCues({
          narrationLimit: 3,
          batches,
          state: undefined,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: [] as readonly ServerBatch[] },
    );
  }

  it("presents two batches delivered in one render as two moments", async () => {
    const { result, rerender } = renderCuesOnBatches();
    await advance(0);

    rerender([singleServerBatch([REVEAL]), singleServerBatch([CHECK])]);
    await advance(0);

    // The reveal's own batch carried no close, so its scene plays with the outcome still
    // unknown — exactly as it does when the two batches arrive in two renders.
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.resolution).toBe("pending");
    expect(result.current.securityRevealPending).toBe(true);

    await advance(REVEAL_EXIT_AT_MS + CLASH_TOTAL_MS + SECURITY_BRANCH_TOTAL_MS);
    // The second batch's close is what hands the board back.
    expect(result.current.securityRevealPending).toBe(false);
  });

  it("presents one batch split across two renders once, as one moment", async () => {
    const { result, rerender } = renderCuesOnBatches();
    await advance(0);

    const batch = singleServerBatch([REVEAL, CHECK]);
    rerender([batch]);
    // The same batch again, in a fresh array: already presented, so nothing replays.
    rerender([batch]);

    // One batch carrying the whole check plays ONE scene, and it knows its outcome.
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
    expect(result.current.securityClash?.resolution).toBe("battle");

    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
    // A second presentation of the same batch would have queued a second scene.
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("match cues", () => {
  it("plays nothing for the history a reconnect replays and settles on the final state", async () => {
    // A reconnect delivers the whole match at once, as the first batch observed.
    const { result } = renderCues([ATTACK, CHECK, TURN_END]);
    await advance(0);

    expect(playSound).not.toHaveBeenCalled();
    expect(result.current.securityClash).toBeNull();
    expect(result.current.turnTransition).toBeNull();
    expect(result.current.attackLunge).toBeNull();
    expect(result.current.attackAnnouncement).toBeNull();
    expect(result.current.sidePanels).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("finishes a visible phase ribbon before presenting a fast bot's next play", async () => {
    const { result, rerender } = renderCues();
    const main: ServerEvent = { kind: "phaseChanged", phase: "Main", turnSeat: 1, turnCount: 4 };
    rerender([main]);
    await advance(0);
    expect(result.current.phaseBanner?.phase).toBe("Main");
    await advance(100);
    rerender([main, OPP_PLAY]);
    await advance(0);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.phaseBanner?.phase).toBe("Main");
    await advance(TIMINGS.phaseBanner - 100 + TIMINGS.phaseBannerGap + 16);
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.zoneShowcase).not.toBeNull();
  });

  it.each(["separate", "combined", "raw"])(
    "plays every queued turn ribbon a bot raised before presenting its attack (%s batch)",
    async (delivery) => {
      const { result, rerender } = renderCues([], undefined, delivery === "raw");
      const turnEnd: ServerEvent = { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 3 };
      const phases: ServerEvent[] = [
        turnEnd,
        ...["Active", "Draw", "Breeding", "Main"].map((phase) => ({
          kind: "phaseChanged" as const,
          phase,
          turnSeat: 1 as const,
          turnCount: 4,
        })),
      ];
      rerender(delivery !== "separate" ? [...phases, ATTACK, REVEAL, CHECK] : phases);
      await advance(100);
      if (delivery === "separate") rerender([...phases, ATTACK, REVEAL, CHECK]);
      // The seat change opens, then every phase the burst carried, in order.
      expect(result.current.turnTransition).not.toBeNull();
      expect(result.current.phaseBanner).toBeNull();
      expect(result.current.attackAnnouncement).toBeNull();
      expect(result.current.attackLunge).toBeNull();
      expect(result.current.securityClash).toBeNull();
      await advance(TIMINGS.turnBanner - 100 + TIMINGS.phaseBannerGap + 16);
      for (const phase of ["Active", "Draw", "Breeding", "Main"]) {
        expect(result.current.phaseBanner?.phase).toBe(phase);
        expect(result.current.attackAnnouncement).toBeNull();
        await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + 16);
      }
      expect(result.current.attackAnnouncement).not.toBeNull();
    },
  );

  it("finishes the turn ribbon before presenting a security check arriving from the bot", async () => {
    const { result, rerender } = renderCues();
    rerender([TURN_END]);
    await advance(100);
    expect(result.current.turnTransition).not.toBeNull();
    rerender([TURN_END, ATTACK, REVEAL, CHECK]);
    await advance(0);
    expect(result.current.securityBreak).toBeNull();
    expect(result.current.securityClash).toBeNull();
    expect(result.current.turnTransition).not.toBeNull();
    await advance(TIMINGS.turnBanner - 100 + TIMINGS.phaseBannerGap + 16);
    expect(result.current.turnTransition).toBeNull();
    expect(result.current.securityBreak).not.toBeNull();
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash).not.toBeNull();
  });

  it("waits for the opponent's card arrival and field burst before ending the turn", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([OPP_PLAY, { ...UNSUSPEND_PHASE, phase: "End", turnSeat: 1 }, TURN_END]);
    await advance(0);
    expect(result.current.zoneShowcase).not.toBeNull();
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.turnTransition).toBeNull();
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.permanentBursts.size).toBe(1);
    expect(result.current.phaseBanner).toBeNull();
    await advance(TIMINGS.cardBurst + 16);
    expect(result.current.phaseBanner?.phase).toBe("End");
    await advance(TIMINGS.phaseBanner);
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.turnTransition).toBeNull();
    await advance(TIMINGS.phaseBannerGap);
    expect(result.current.turnTransition).not.toBeNull();
  });

  it("waits for a raw play event's batch before showing the end banner", async () => {
    const raw: ServerEvent[] = [OPP_PLAY, TURN_END];
    const { result, rerender } = renderHook(
      ({ phaseEvents, batches }: { phaseEvents: readonly ServerEvent[]; batches: readonly ServerBatch[] }) =>
        useMatchCues({
          narrationLimit: 3,
          phaseEvents,
          batches,
          state: undefined,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { phaseEvents: [] as readonly ServerEvent[], batches: [] as readonly ServerBatch[] } },
    );
    rerender({ phaseEvents: raw, batches: [] });
    await advance(100);
    expect(result.current.turnTransition).toBeNull();
    rerender({ phaseEvents: raw, batches: [singleServerBatch(raw)] });
    await advance(0);
    expect(result.current.zoneShowcase).not.toBeNull();
    expect(result.current.turnTransition).toBeNull();
    await advance(SHOWCASE_TOTAL_MS + TIMINGS.cardBurst + 16);
    expect(result.current.turnTransition).not.toBeNull();
  });

  it("can skip an end banner while the play batch is still open", async () => {
    const raw: ServerEvent[] = [OPP_PLAY, TURN_END];
    const { result, rerender } = renderHook(
      ({ phaseEvents, batches }: { phaseEvents: readonly ServerEvent[]; batches: readonly ServerBatch[] }) =>
        useMatchCues({
          narrationLimit: 3,
          phaseEvents,
          batches,
          state: undefined,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { phaseEvents: [] as readonly ServerEvent[], batches: [] as readonly ServerBatch[] } },
    );
    rerender({ phaseEvents: raw, batches: [] });
    await advance(100);
    expect(result.current.turnTransition).toBeNull();
    act(() => result.current.skipAnimations());
    await advance(0);
    expect(result.current.phaseTransitionPending).toBe(false);
    expect(result.current.turnTransition).toBeNull();
  });

  it("releases the end banner when a play batch close is lost", async () => {
    const raw: ServerEvent[] = [OPP_PLAY, TURN_END];
    const { result, rerender } = renderHook(
      ({ phaseEvents, batches }: { phaseEvents: readonly ServerEvent[]; batches: readonly ServerBatch[] }) =>
        useMatchCues({
          narrationLimit: 3,
          phaseEvents,
          batches,
          state: undefined,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { phaseEvents: [] as readonly ServerEvent[], batches: [] as readonly ServerBatch[] } },
    );
    rerender({ phaseEvents: raw, batches: [] });
    await advance(100);
    expect(result.current.turnTransition).toBeNull();
    await advance(PRESENTED_BOARD_BUDGET_MS + 16);
    expect(result.current.turnTransition).not.toBeNull();
  });

  it("announces unrelated phases in order when they arrive in one batch", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    const phases = ["Active", "Draw", "Breeding", "Main", "End"];
    rerender(phases.map((phase) => ({ kind: "phaseChanged", phase, turnSeat: 0, turnCount: 5 })) as ServerEvent[]);
    await advance(0);
    for (const phase of phases) {
      expect(result.current.phaseBanner?.phase).toBe(phase);
      await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    }
    expect(result.current.phaseBanner).toBeNull();
  });

  it("holds the pre-draw hand through unsuspend and locks actions through breeding's announcement", async () => {
    const anchor = document.createElement("div");
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
    const drawAnchors = {
      ...anchors,
      board: { current: anchor },
      yourDeck: { current: anchor },
      yourHandDock: { current: anchor },
    };
    const before = {
      players: [0, 1].map(() => ({ hand: [], handCount: 5, deckCount: 40, battleArea: [], trash: [] })),
    } as unknown as GameState;
    const after = {
      ...before,
      players: before.players.map((player, seat) => (seat === 0 ? { ...player, handCount: 6, deckCount: 39 } : player)),
    } as unknown as GameState;
    const feed = batchFeed();
    const { result, rerender } = renderHook(
      ({ state, events }: { state: GameState; events: readonly ServerEvent[] }) =>
        useMatchCues({
          narrationLimit: 3,
          batches: feed(events),
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors: drawAnchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { state: before, events: [] as readonly ServerEvent[] } },
    );
    await advance(0);
    rerender({
      state: after,
      events: [UNSUSPEND_PHASE, { ...UNSUSPEND_PHASE, phase: "Draw" }, { ...UNSUSPEND_PHASE, phase: "Breeding" }],
    });
    await advance(0);
    expect(result.current.phaseBanner?.phase).toBe("Active");
    expect(result.current.phaseTransitionPending).toBe(true);
    expect(result.current.heldDrawState?.state.players[0]?.handCount).toBe(5);
    expect(result.current.drawFlights).toHaveLength(0);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner?.phase).toBe("Draw");
    expect(result.current.heldDrawState).toBeUndefined();
    expect(result.current.drawFlights).toHaveLength(1);
    expect(result.current.phaseTransitionPending).toBe(true);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner?.phase).toBe("Breeding");
    expect(result.current.phaseTransitionPending).toBe(true);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseTransitionPending).toBe(false);
  });

  it("keeps the turn readout on the turn whose cues are still playing", async () => {
    // The shape that made a viewer see a card reach their hand on the opponent's turn: the
    // server resolves the handover and the opponent's opening phases into the same patch as
    // the effect draw that preceded them, so the live turn flips while the flight is still up.
    const anchor = document.createElement("div");
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
    const drawAnchors = {
      ...anchors,
      board: { current: anchor },
      yourDeck: { current: anchor },
      yourHandDock: { current: anchor },
    };
    const before = {
      turnSeat: 0,
      turnCount: 2,
      players: [0, 1].map(() => ({ hand: [], handCount: 5, deckCount: 40, battleArea: [], trash: [] })),
    } as unknown as GameState;
    const drawn = {
      ...before,
      players: before.players.map((player, seat) => (seat === 0 ? { ...player, handCount: 6, deckCount: 39 } : player)),
    } as unknown as GameState;
    const handedOver = { ...drawn, turnSeat: 1, turnCount: 3 } as unknown as GameState;
    const feed = batchFeed();
    const { result, rerender } = renderHook(
      ({ state, events }: { state: GameState; events: readonly ServerEvent[] }) =>
        useMatchCues({
          narrationLimit: 3,
          batches: feed(events),
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors: drawAnchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { state: before, events: [] as readonly ServerEvent[] } },
    );
    await advance(0);
    expect(result.current.displayedTurn).toEqual({ seat: 0, count: 2 });
    rerender({ state: drawn, events: [] });
    await advance(0);
    expect(result.current.drawFlights).toHaveLength(1);
    rerender({
      state: handedOver,
      events: [
        { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 2 },
        { kind: "phaseChanged", phase: "Active", turnSeat: 1, turnCount: 2 },
        { kind: "phaseChanged", phase: "Draw", turnSeat: 1, turnCount: 3 },
      ],
    });
    await advance(0);
    // The live state is already the opponent's turn. The readout is not, because the ribbon
    // that announces it is still waiting for the flight.
    expect(handedOver.turnSeat).toBe(1);
    expect(result.current.drawFlights).toHaveLength(1);
    expect(result.current.displayedTurn).toEqual({ seat: 0, count: 2 });
    await advance(TIMINGS.drawFlight);
    expect(result.current.drawFlights).toHaveLength(0);
    await advance(TIMINGS.turnBanner + TIMINGS.phaseBannerGap);
    expect(result.current.displayedTurn?.seat).toBe(1);
    await advance((TIMINGS.phaseBanner + TIMINGS.phaseBannerGap) * 3);
    expect(result.current.displayedTurn).toEqual({ seat: 1, count: 3 });
    expect(result.current.phaseTransitionPending).toBe(false);
  });

  it("releases the phase lock when the first turn skips drawing", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([UNSUSPEND_PHASE, { ...UNSUSPEND_PHASE, phase: "Breeding" }]);
    await advance(0);
    expect(result.current.phaseTransitionPending).toBe(true);
    await advance((TIMINGS.phaseBanner + TIMINGS.phaseBannerGap) * 2);
    expect(result.current.phaseTransitionPending).toBe(false);
    expect(result.current.heldDrawState).toBeUndefined();
    expect(result.current.drawFlights).toHaveLength(0);
  });

  it("holds the opponent's hatch until Breeding finishes and keeps phase text stable between ribbons", async () => {
    const state = {
      phase: Phase.Main,
      players: [0, 1].map(() => ({
        hand: [],
        handCount: 5,
        deckCount: 40,
        eggDeckCount: 4,
        battleArea: [],
        trash: [],
      })),
    } as unknown as GameState;
    const garurumon = new Permanent();
    garurumon.permanentId = "garurumon";
    garurumon.isSuspended = true;
    state.players[1]!.battleArea.push(garurumon);
    const frozen = new Permanent();
    frozen.permanentId = "frozen";
    frozen.isSuspended = true;
    state.players[1]!.battleArea.push(frozen);
    const snapshots: StateSnapshot[] = [];
    const { result, rerender } = renderCuesOverBoard(state, snapshots);
    await advance(0);
    const phases: ServerEvent[] = [
      ...["Active", "Draw", "Breeding", "Main"].map((phase) => ({
        kind: "phaseChanged" as const,
        phase,
        turnSeat: 1 as const,
        turnCount: 2,
      })),
    ];
    const unsuspend: ServerEvent = {
      kind: "cardsMoved",
      instanceIds: ["garurumon"],
      from: "suspended",
      to: "unsuspended",
    };
    const opening = [phases[0]!, unsuspend, ...phases.slice(1, 3)];
    rerender(opening);
    await advance(0);
    // The live schema changes while Unsuspend is still on screen.
    state.players[1]!.eggDeckCount = 3;
    const egg = new Permanent();
    egg.permanentId = "egg";
    egg.topCard = new CardInstance();
    egg.topCard.cardId = "BT24-007";
    state.players[1]!.breeding = egg;
    snapshots.push({ stateVersion: 2, state: snapshotGameState(state) });
    // Main has already evolved that same stack in the live state.
    egg.topCard.cardId = "ST2-03";
    garurumon.isSuspended = true;
    rerender([...opening, { kind: "hatched", seat: 1, cardId: "BT24-007", permanentId: "egg" }, phases[3]!]);
    for (const phase of ["Active", "Draw", "Breeding"]) {
      expect(result.current.phaseBanner?.phase).toBe(phase);
      expect(result.current.heldPhaseState?.players[1]?.battleArea[0]?.isSuspended).toBe(false);
      expect(result.current.heldPhaseState?.players[1]?.battleArea[1]?.isSuspended).toBe(true);
      expect(result.current.heldBreedingState?.seat).toBe(1);
      expect(result.current.heldBreedingState?.player.eggDeckCount).toBe(4);
      await advance(TIMINGS.phaseBanner);
      expect(result.current.phaseBanner).toBeNull();
      expect(result.current.displayedPhase).toBe(phase);
      expect(result.current.heldBreedingState?.player.eggDeckCount).toBe(phase === "Breeding" ? 3 : 4);
      await advance(TIMINGS.phaseBannerGap);
    }
    expect(result.current.heldBreedingState?.player.breeding?.topCard.cardId).toBe("BT24-007");
    await advance(16);
    expect(result.current.permanentBursts.has("egg")).toBe(true);
    await advance(TIMINGS.cardBurst + 32);
    expect(result.current.phaseBanner?.phase).toBe("Main");
    expect(result.current.displayedPhase).toBe("Main");
    expect(result.current.heldPhaseState?.players[1]?.battleArea[0]?.isSuspended).toBe(false);
    await advance(TIMINGS.phaseBanner);
    expect(result.current.heldBreedingState).toBeUndefined();
    expect(result.current.heldPhaseState).toBeUndefined();
  });

  it.each(["hatched", "movedFromBreeding"] as const)(
    "waits for separately patched %s before announcing Main",
    async (kind) => {
      const breeding = {
        kind: "phaseChanged",
        phase: "Breeding",
        turnSeat: 1,
        turnCount: 2,
        seq: 1,
        batch: "breeding",
        stateVersion: 0,
      } as ServerEvent;
      const hatch = {
        kind,
        seat: 1,
        cardId: "BT15-006",
        permanentId: "egg",
        seq: 2,
        batch: "hatch",
        stateVersion: 1,
      } as ServerEvent;
      const main = {
        kind: "phaseChanged",
        phase: "Main",
        turnSeat: 1,
        turnCount: 2,
        seq: 3,
        batch: "main",
        stateVersion: 2,
      } as ServerEvent;
      const breedingBatch: ServerBatch = {
        id: "breeding",
        stateVersion: 1,
        events: [breeding as import("@aegis/shared").SequencedServerEvent],
      };
      const hatchBatch: ServerBatch = {
        id: "hatch",
        stateVersion: 2,
        events: [hatch as import("@aegis/shared").SequencedServerEvent],
      };
      const mainBatch: ServerBatch = {
        id: "main",
        stateVersion: 3,
        events: [main as import("@aegis/shared").SequencedServerEvent],
      };
      const { result, rerender } = renderHook(
        ({ batches, events }: { batches: readonly ServerBatch[]; events: readonly ServerEvent[] }) =>
          useMatchCues({
            batches,
            phaseEvents: events,
            viewerSeat: VIEWER,
            state: undefined,
            mulliganOpen: false,
            anchors,
            onActionRejected: vi.fn<(reason: string) => void>(),
          }),
        { initialProps: { batches: [] as readonly ServerBatch[], events: [] as readonly ServerEvent[] } },
      );
      await advance(0);
      rerender({ batches: [breedingBatch], events: [breeding] });
      await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
      // Raw messages arrive before the patch that closes the hatch batch.
      rerender({ batches: [breedingBatch], events: [breeding, hatch, main] });
      await advance(32);
      expect(result.current.phaseBanner).toBeNull();
      rerender({ batches: [breedingBatch, hatchBatch, mainBatch], events: [breeding, hatch, main] });
      await advance(32);
      expect(result.current.permanentBursts.has("egg")).toBe(true);
      expect(result.current.phaseBanner).toBeNull();
      await advance(TIMINGS.cardBurst + 32);
      expect(result.current.phaseBanner?.phase).toBe("Main");
    },
  );

  it("holds the incoming seat's turn-start draw when the outgoing seat drew by effect in the same patch", async () => {
    const board = document.createElement("div");
    const deck = document.createElement("div");
    const hand = document.createElement("div");
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
    vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
    vi.spyOn(hand, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 500, 300, 80));
    const state = {
      players: [0, 1].map(() => ({ hand: [], handCount: 5, deckCount: 40, battleArea: [], trash: [] })),
    } as unknown as GameState;
    const reports: import("@aegis/shared").PresentationReport[] = [];
    const feed = batchFeed();
    const { result, rerender } = renderHook(
      (events: readonly ServerEvent[]) =>
        useMatchCues({
          batches: feed(events),
          phaseEvents: events,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          onPresentationReport: (report) => reports.push(report),
          anchors: {
            ...anchors,
            board: { current: board },
            yourDeck: { current: deck },
            yourHandDock: { current: hand },
            oppDeck: { current: deck },
            oppHandStrip: { current: hand },
          },
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: [] as readonly ServerEvent[] },
    );
    await advance(0);

    // One patch: the viewer's last effect draw, then the whole turn flip to the opponent,
    // whose turn-start draw reaches the client as a hand count and no event at all.
    state.players[VIEWER]!.handCount = 6;
    state.players[1]!.handCount = 6;
    rerender([
      { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: ["effect-draw"], seat: VIEWER },
      { kind: "phaseChanged", phase: "End", turnSeat: VIEWER, turnCount: 4 },
      { kind: "turnEnded", endingSeat: VIEWER, nextSeat: 1, turnCount: 4 },
      { kind: "phaseChanged", phase: "Active", turnSeat: 1, turnCount: 5 },
      { kind: "phaseChanged", phase: "Draw", turnSeat: 1, turnCount: 5 },
      { kind: "phaseChanged", phase: "Breeding", turnSeat: 1, turnCount: 5 },
    ]);
    await advance(32);

    // The viewer's own draw belongs to the turn that just ran, so it is on screen at once.
    // The opponent is the held seat: its count stays at the figure the turn opened with.
    const turnDrawStarted = () => reports.some((report) => report.track.startsWith("turnDrawFlight-"));
    expect(reports.some((report) => report.track.startsWith("drawFlight-"))).toBe(true);
    expect(result.current.heldDrawState?.seat).toBe(1);
    expect(result.current.heldDrawState?.state.players[1]?.handCount).toBe(5);
    expect(turnDrawStarted()).toBe(false);

    // It stays held through the viewer's own flight and every ribbon that precedes its
    // own: the End ribbon, the turn change, then Active.
    const seen: string[] = [];
    while (result.current.phaseBanner?.phase !== "Draw") {
      expect(turnDrawStarted()).toBe(false);
      const shown = result.current.phaseBanner?.phase;
      if (shown && seen.at(-1) !== shown) seen.push(shown);
      await advance(100);
    }
    expect(seen).toEqual(["End", "Active"]);
    expect(result.current.turnTransition).toBeNull();
    expect(result.current.heldDrawState).toBeUndefined();
    expect(turnDrawStarted()).toBe(true);
  });

  it("holds a mutable server hand before its patched batch closes, without replaying phase events", async () => {
    const state = {
      players: [0, 1].map(() => ({ hand: [], handCount: 5, deckCount: 40, battleArea: [], trash: [] })),
    } as unknown as GameState;
    const phases: ServerEvent[] = [
      UNSUSPEND_PHASE,
      { ...UNSUSPEND_PHASE, phase: "Draw" },
      { ...UNSUSPEND_PHASE, phase: "Breeding" },
    ];
    const { result, rerender } = renderHook(
      ({ phaseEvents, batches }: { phaseEvents: readonly ServerEvent[]; batches: readonly ServerBatch[] }) =>
        useMatchCues({
          narrationLimit: 3,
          state,
          phaseEvents,
          batches,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { phaseEvents: [] as readonly ServerEvent[], batches: [] as readonly ServerBatch[] } },
    );
    await advance(0);
    // Events arrive before Colyseus mutates the existing state object. The close
    // marker is sent after that patch, so these are three independent renders.
    rerender({ phaseEvents: phases, batches: [] });
    state.players[0]!.handCount = 6;
    state.players[0]!.deckCount = 39;
    rerender({ phaseEvents: phases, batches: [] });
    await advance(0);
    expect(result.current.phaseBanner?.phase).toBe("Active");
    expect(result.current.heldDrawState?.state.players[0]?.handCount).toBe(5);
    expect(result.current.heldDrawState?.state.players[0]?.deckCount).toBe(40);
    expect(result.current.phaseTransitionPending).toBe(true);
    rerender({ phaseEvents: phases, batches: [singleServerBatch(phases)] });
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner?.phase).toBe("Draw");
    expect(result.current.heldDrawState).toBeUndefined();
    await advance((TIMINGS.phaseBanner + TIMINGS.phaseBannerGap) * 2);
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.phaseTransitionPending).toBe(false);
  });

  it("releases the draw hold for an effect draw that flips the turn in the same patch", async () => {
    const state = {
      players: [0, 1].map(() => ({ hand: [], handCount: 5, deckCount: 40, battleArea: [], trash: [] })),
    } as unknown as GameState;
    // What an Option that draws sends when the turn ends on its resolution: the draw and
    // the whole next-turn pipeline coalesce into one patch.
    const events: ServerEvent[] = [
      { kind: "cardsMoved", from: "deck", to: "hand", instanceIds: ["drawn-a", "drawn-b"], seat: 0 },
      UNSUSPEND_PHASE,
      { ...UNSUSPEND_PHASE, phase: "Draw" },
    ];
    const { result, rerender } = renderHook(
      ({ phaseEvents, batches }: { phaseEvents: readonly ServerEvent[]; batches: readonly ServerBatch[] }) =>
        useMatchCues({
          narrationLimit: 3,
          state,
          phaseEvents,
          batches,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { phaseEvents: [] as readonly ServerEvent[], batches: [] as readonly ServerBatch[] } },
    );
    await advance(0);
    rerender({ phaseEvents: events, batches: [] });
    state.players[0]!.handCount = 7;
    state.players[0]!.deckCount = 38;
    rerender({ phaseEvents: events, batches: [singleServerBatch(events)] });
    await advance(32);
    // The Active banner armed the hold before the batch was read; the drawn cards belong
    // to the turn that just ended, so they may not wait behind its ribbons.
    expect(result.current.heldDrawState).toBeUndefined();
  });

  it("does not lock actions or hold a hand when reconnecting to phase history", async () => {
    const { result } = renderCues([
      UNSUSPEND_PHASE,
      { ...UNSUSPEND_PHASE, phase: "Draw" },
      { ...UNSUSPEND_PHASE, phase: "Breeding" },
    ]);
    await advance(0);
    expect(result.current.phaseTransitionPending).toBe(false);
    expect(result.current.heldDrawState).toBeUndefined();
    expect(result.current.phaseBanner).toBeNull();
  });

  /**
   * The whole turn pipeline in one batch — End, turnEnded, Active, Draw, Breeding — which
   * is what the server sends when the seat that just ended had nothing left to resolve.
   * The presentation once collapsed that to the Breeding ribbon alone, so a turn opened on
   * its turn-start draw with nothing saying the seat had changed.
   */
  it("announces the seat change when a whole turn pipeline arrives in one batch", async () => {
    const board = document.createElement("div");
    const deck = document.createElement("div");
    const hand = document.createElement("div");
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
    vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
    vi.spyOn(hand, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 500, 300, 80));
    const state = {
      players: [0, 1].map(() => ({ hand: [], handCount: 5, battleArea: [], trash: [] })),
    } as unknown as GameState;
    const reports: import("@aegis/shared").PresentationReport[] = [];
    const feed = batchFeed();
    const { result, rerender } = renderHook(
      (events: readonly ServerEvent[]) =>
        useMatchCues({
          batches: feed(events),
          phaseEvents: events,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          onPresentationReport: (report) => reports.push(report),
          anchors: {
            ...anchors,
            board: { current: board },
            yourDeck: { current: deck },
            yourHandDock: { current: hand },
            oppDeck: { current: deck },
            oppHandStrip: { current: hand },
          },
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: [] as readonly ServerEvent[] },
    );
    await advance(0);

    // The turn-start draw the new seat takes, which is the only other thing on screen.
    state.players[VIEWER]!.handCount = 6;
    rerender([
      { kind: "phaseChanged", phase: "End", turnSeat: 1, turnCount: 4 },
      { kind: "turnEnded", endingSeat: 1, nextSeat: VIEWER, turnCount: 4 },
      { kind: "phaseChanged", phase: "Active", turnSeat: VIEWER, turnCount: 5 },
      { kind: "phaseChanged", phase: "Draw", turnSeat: VIEWER, turnCount: 5 },
      { kind: "phaseChanged", phase: "Breeding", turnSeat: VIEWER, turnCount: 5 },
    ]);
    await advance(0);

    // The ending seat's End ribbon opens the burst.
    expect(result.current.drawFlights).toHaveLength(0);
    expect(result.current.turnTransition).toBeNull();
    expect(result.current.phaseBanner?.phase).toBe("End");
    expect(result.current.phaseBanner?.side).toBe("opp");

    // The ribbon then names the seats of the turn that ended, and holds its own time.
    // Both prerequisite waits poll, so every checkpoint below allows a poll of slack.
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + POLL_MS);
    expect(result.current.turnTransition).toEqual({ endingSeat: 1, nextSeat: VIEWER, turnCount: 4 });
    expect(result.current.phaseBanner).toBeNull();
    await advance(TIMINGS.turnBanner - POLL_MS * 4);
    expect(result.current.turnTransition).not.toBeNull();

    // Every phase the burst carried follows it, in order. The turn-start draw is held
    // back until its own Draw ribbon names it.
    await advance(POLL_MS * 4 + TIMINGS.phaseBannerGap + POLL_MS * 2);
    expect(result.current.turnTransition).toBeNull();
    expect(result.current.phaseBanner?.phase).toBe("Active");
    expect(result.current.phaseBanner?.side).toBe("you");
    expect(result.current.drawFlights).toHaveLength(0);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + POLL_MS * 2);
    expect(result.current.phaseBanner?.phase).toBe("Draw");
    expect(result.current.drawFlights).toHaveLength(1);
    const drawMs = result.current.drawFlights[0]!.duration;
    await advance(drawMs + TIMINGS.drawBurst + POLL_MS);
    expect(result.current.drawFlights).toHaveLength(0);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + POLL_MS * 2);
    expect(result.current.phaseBanner?.phase).toBe("Breeding");
    expect(result.current.phaseBanner?.side).toBe("you");
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.presenting).toBe(false);

    const banners = reports.filter((report) => report.track === "phaseBanner" && report.phase === "started");
    expect(banners.map((report) => report.stepId)).toEqual([
      "phase-banner-1",
      "turn-banner-4",
      "phase-banner-2",
      "phase-banner-3",
      "phase-banner-4",
    ]);
    // The report says which side each once-per-side cue was drawn on, so a log can tell
    // the viewer's turn-start draw from the opponent's.
    expect(banners.map((report) => report.side)).toEqual(["opp", "you", "you", "you", "you"]);
    const draws = reports.filter((report) => report.track.startsWith("turnDrawFlight-"));
    expect(draws).not.toHaveLength(0);
    expect(new Set(draws.map((report) => report.side))).toEqual(new Set(["you"]));
  });

  it("serializes real batched turn, unsuspend and draw announcements", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([
      TURN_END,
      UNSUSPEND_PHASE,
      { ...UNSUSPEND_PHASE, phase: "Draw" },
      { ...UNSUSPEND_PHASE, phase: "Breeding" },
    ]);
    await advance(0);
    expect(result.current.turnTransition).not.toBeNull();
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.unsuspendSweep).toBeNull();
    expect(result.current.presenting).toBe(true);
    await advance(TIMINGS.turnBanner + TIMINGS.phaseBannerGap);
    expect(result.current.turnTransition).toBeNull();
    expect(result.current.phaseBanner?.phase).toBe("Active");
    expect(result.current.unsuspendSweep?.seat).toBe(0);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner?.phase).toBe("Draw");
    expect(result.current.unsuspendSweep).toBeNull();
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner?.phase).toBe("Breeding");
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap);
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.presenting).toBe(false);
  });

  it("drains turn and phase holds when the tab becomes hidden", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([
      TURN_END,
      UNSUSPEND_PHASE,
      { ...UNSUSPEND_PHASE, phase: "Draw" },
      { ...UNSUSPEND_PHASE, phase: "Breeding" },
    ]);
    await advance(0);
    expect(result.current.turnTransition).not.toBeNull();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    try {
      act(() => document.dispatchEvent(new Event("visibilitychange")));
      await advance(0);
      expect(result.current.turnTransition).toBeNull();
      expect(result.current.phaseBanner).toBeNull();
      expect(result.current.phaseTransitionPending).toBe(false);
      expect(result.current.heldDrawState).toBeUndefined();
      expect(result.current.heldSuspendedIds.size).toBe(0);
    } finally {
      hidden.mockRestore();
      act(() => document.dispatchEvent(new Event("visibilitychange")));
    }
    await advance(TIMINGS.phaseBanner * 4);
    expect(result.current.phaseBanner).toBeNull();
    expect(result.current.presenting).toBe(false);
  });

  it("plays a live turn banner for its full time and then clears it", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([TURN_END]);
    await advance(0);
    expect(result.current.turnTransition).toEqual({ endingSeat: 1, nextSeat: 0, turnCount: 4 });

    await advance(TIMINGS.turnBanner - 1);
    expect(result.current.turnTransition).not.toBeNull();
    await advance(1);
    expect(result.current.turnTransition).toBeNull();
  });

  it("leans the attacker at the shield and holds the clash on its own clock", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, CHECK]);
    await advance(0);
    expect(result.current.attackLunge).toEqual({ permanentId: "perm-1", direction: "down" });
    // The shield arms first, and the reveal waits for its glass to break.
    expect(result.current.securityBreak).toMatchObject({ seat: 0, side: "you", phase: "arm" });
    expect(result.current.securityClash).toBeNull();

    await advance(TIMINGS.securityArm);
    expect(result.current.securityBreak?.phase).toBe("break");
    expect(result.current.securityHitSeat).toBe(0);

    // Each cue keeps its own clock: the lunge is over long before the break is.
    await advance(TIMINGS.attackLunge - TIMINGS.securityArm);
    expect(result.current.attackLunge).toBeNull();

    await advance(SECURITY_BREAK_TOTAL_MS - TIMINGS.attackLunge);
    expect(result.current.securityBreak).toBeNull();
    expect(result.current.securityHitSeat).toBeNull();
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");

    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  // The point of the split: the card is on screen at the moment of the attack, and
  // everything it causes — its effect, its decisions, its battle — plays after it.
  it("shows the revealed card, then takes it off the screen before the check resolves", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, REVEAL]);
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
    expect(result.current.securityClash?.resolution).toBe("pending");

    // The scene plays to its end and the card leaves on its own, so whatever the check
    // does next — its effects, their prompts — happens on a board it has handed over.
    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();

    // The close no longer brings the card back: the viewer has already watched it resolve.
    rerender([ATTACK, REVEAL, CHECK]);
    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  // A reaction the removal arms — "when your opponent's security stack is removed from" —
  // activates between the removal and the battle, so its prompt would otherwise open over a
  // card the check has not finished with. The check keeps the board until it closes.
  it("keeps the board through a check the server has not closed", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([REVEAL]);
    await advance(0);
    expect(result.current.securityRevealPending).toBe(true);

    await advance(REVEAL_EXIT_AT_MS + CLASH_TOTAL_MS + SECURITY_BRANCH_TOTAL_MS);
    expect(result.current.securityRevealPending).toBe(true);
    // The card has left, but the check still owns the board until it closes.
    expect(result.current.securityClash).toBeNull();

    rerender([REVEAL, CHECK]);
    await advance(CLASH_TOTAL_MS + SECURITY_BRANCH_TOTAL_MS);
    expect(result.current.securityRevealPending).toBe(false);
  });

  // The question a check stops to ask cannot wait for a close that only arrives once it is
  // answered, so the question is what gives the board back — never before the reveal.
  it("gives the board back for a question the check stopped to ask", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    rerender({ events: [REVEAL], decisionPending: false });
    await advance(0);
    expect(result.current.securityRevealPending).toBe(true);

    rerender({ events: [REVEAL], decisionPending: true });
    await advance(REVEAL_EXIT_AT_MS - 1);
    expect(result.current.securityRevealPending).toBe(true);

    await advance(1);
    expect(result.current.securityRevealPending).toBe(false);
    // The question opens on a clear board: the card it belongs to has already left.
    expect(result.current.securityClash).toBeNull();
  });

  // A card the viewer already watched resolve does not detour to the side afterwards.
  it("skips the branch for a card that held the screen through its own resolution", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([REVEAL]);
    await advance(REVEAL_SHOWN_AT_MS);

    rerender([REVEAL, EFFECT_CHECK]);
    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityBranch).toBeNull();
    expect(result.current.securityClash).toBeNull();
  });

  it("mirrors the break to whichever seat is being checked", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([{ ...CHECK, seat: 1 }]);
    await advance(0);
    expect(result.current.securityBreak).toMatchObject({ seat: 1, side: "opp" });
  });

  it("holds a security card that resolves an effect to the side, after the reveal", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT_CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityBranch).toBeNull();

    // Strictly after: the card is never held to the side while it is still centre stage,
    // which is what a branch on a clock of its own could not promise.
    await advance(CLASH_TOTAL_MS - 1);
    expect(result.current.securityClash).not.toBeNull();
    expect(result.current.securityBranch).toBeNull();

    await advance(1);
    expect(result.current.securityClash).toBeNull();
    expect(result.current.securityBranch).toMatchObject({ cardId: "BT1-010", side: "you" });

    await advance(SECURITY_BRANCH_TOTAL_MS);
    expect(result.current.securityBranch).toBeNull();
  });

  it("parks a used Option with the security-effect dock instead of narrating its final trash move", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([OPTION_USE, OPTION_ROUTED]);
    await advance(0);
    expect(result.current.optionBranch).toMatchObject({
      cardId: "BT1-090",
      side: "you",
      source: "option",
      state: "docked",
    });

    await advance(TIMINGS.optionDockHold + TIMINGS.securityDockPoll);
    expect(result.current.optionBranch?.state).toBe("closing");
    await advance(SECURITY_DOCK_CLOSE_MS);
    expect(result.current.optionBranch).toBeNull();
  });

  it("owes the screen a reveal from the check until the scene has played it", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    expect(result.current.securityRevealPending).toBe(false);

    // Set in the same pass that observes the check, so a decision arriving with it has
    // nowhere to render before the card does.
    rerender([EFFECT_CHECK]);
    await advance(0);
    expect(result.current.securityRevealPending).toBe(true);

    await advance(EFFECT_CHECK_NOTICE_AT_MS - 1);
    expect(result.current.securityRevealPending).toBe(true);

    await advance(1);
    expect(result.current.securityRevealPending).toBe(false);
  });

  it("gives the screen back at the outcome when the player clicks through the scene", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT_CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_OUTCOME_AT_MS);
    // The outcome beat is decoration, so a click takes the board back from it — and
    // the branch and the reveal hold move up with it rather than waiting it out.
    act(() => result.current.skipAnimations());
    await advance(0);
    expect(result.current.securityClash).toBeNull();
    expect(result.current.securityRevealPending).toBe(false);
    expect(result.current.securityBranch).not.toBeNull();
  });

  // The reference client docks a card with a [Security] effect in its brainstorm slot and
  // keeps it there for the WHOLE resolution — every target pick, every optional yes/no —
  // closing the slot only once the card is disposed (CardController.cs:4062-4232).
  it("docks a card whose [Security] effect the server is still resolving", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, EFFECT_REVEAL]);
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
    expect(result.current.securityBranch).toBeNull();

    // The card is seen centre stage for the hold every check gets, then it leaves for the
    // dock rather than holding the middle of the board for a resolution of unknown length.
    await advance(CLASH_REVEAL_SHOWN_AT_MS);
    expect(result.current.securityClash?.departing).toBeUndefined();
    expect(result.current.securityBranch).toBeNull();
    await advance(CLASH_DOCK_AT_MS - CLASH_REVEAL_SHOWN_AT_MS);
    expect(result.current.securityClash?.departing).toBe(true);
    expect(result.current.securityBranch).toBeNull();
    await advance(TIMINGS.clashExit);
    expect(result.current.securityClash).toBeNull();
    expect(result.current.securityBranch).toMatchObject({ cardId: "BT1-010", side: "you", state: "docked" });

    // Open-ended: nothing but the close takes it away.
    await advance(CLASH_TOTAL_MS + SECURITY_BRANCH_TOTAL_MS);
    expect(result.current.securityBranch?.state).toBe("docked");

    // The dock notices its close on its next poll, and only then starts leaving.
    rerender([ATTACK, EFFECT_REVEAL, EFFECT_CHECK]);
    await advance(TIMINGS.securityDockPoll);
    expect(result.current.securityBranch?.state).toBe("closing");
    await advance(SECURITY_DOCK_CLOSE_MS);
    expect(result.current.securityBranch).toBeNull();
    expect(result.current.securityClash).toBeNull();
  });

  // Reveal, dock, then the prompt: the question is asked beside the card that asked it,
  // and never before the card has arrived at the side.
  it("opens the check's question only once its card has docked", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    rerender({ events: [EFFECT_REVEAL], decisionPending: false });
    await advance(0);
    expect(result.current.securityRevealPending).toBe(true);

    rerender({ events: [EFFECT_REVEAL], decisionPending: true });
    await advance(DOCKED_AT_MS - 1);
    expect(result.current.securityRevealPending).toBe(true);

    await advance(1);
    expect(result.current.securityRevealPending).toBe(false);
    // The prompt opens beside the card, not over an empty board.
    expect(result.current.securityBranch?.state).toBe("docked");
  });

  it("reads out what the docked card did beside it, not after its close", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT_REVEAL, EFFECT_NOTICE]);
    await advance(DOCKED_AT_MS - 1);
    expect(result.current.notices).toEqual([]);

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.securityBranch?.state).toBe("docked");
  });

  // BT10-087 Taiki Kudo: a [Security] "play this card" whose [On Play] then reveals four
  // cards. What the play caused belongs after the dock and after the card reaches the
  // field, so neither its notice nor its revealed-cards panel may appear before them.
  it("holds an [On Play] notice and its revealed-cards panel until the card has docked and entered the field", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    const opened = [ATTACK, OPP_EFFECT_REVEAL, OPP_SECURITY_NOTICE] as const;
    rerender([...opened]);
    await advance(DOCKED_AT_MS - 1);
    expect(result.current.notices).toEqual([]);
    expect(result.current.sidePanels).toEqual([]);

    // Step 2: the card is parked at the side and its [Security] clause reads out beside it.
    await advance(1);
    expect(result.current.securityBranch?.state).toBe("docked");
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.sidePanels).toEqual([]);

    // Step 3/4 arrive together: the card is played and its [On Play] reveals four cards.
    rerender([...opened, OPP_TAIKI_PLAY, OPP_ON_PLAY, ...TAIKI_REVEALS]);
    await advance(0);
    // The card is still on its way to the field, so nothing the play caused is on screen.
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.sidePanels).toEqual([]);
    expect(result.current.zoneShowcase?.cardId).toBe("BT10-087");

    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    // The arrival releases the effect and its results while Security remains readable.
    expect(result.current.notices).toHaveLength(2);
    const panel = result.current.sidePanels.at(-1);
    expect(panel?.titleKey).toBe("panel.revealedCards");
    expect(panel?.cards).toHaveLength(4);
  });

  /* The live order: the server resolves the whole [Security] play in one tick, so the
     reveal, the free play and the four [On Play] reveals all reach the client in a SINGLE
     batch, and `securityChecked` only arrives seconds later when the bot answers its
     decisions. Everything the played card did still has to wait for the card to arrive. */
  it("plays the card-enter cue before the [On Play] presentation when the whole check arrives in one batch", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, OPP_EFFECT_REVEAL, OPP_SECURITY_NOTICE, OPP_TAIKI_PLAY, OPP_ON_PLAY, ...TAIKI_REVEALS]);

    // Step 2: docked, with only the [Security] clause beside it.
    await advance(DOCKED_AT_MS);
    expect(result.current.securityBranch?.state).toBe("docked");
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.sidePanels).toEqual([]);
    // Step 3: the played card is on its way to the field and held off the board until then.
    expect(result.current.zoneShowcase?.cardId).toBe("BT10-087");
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(true);
    // Nothing the play caused may be on screen while it is still arriving.
    expect(result.current.sidePanels).toEqual([]);

    // Step 4: only after arrival, the effect and its results join the Security record.
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(false);
    expect(result.current.notices).toHaveLength(2);
    expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.revealedCards");
    expect(result.current.sidePanels.at(-1)?.cards).toHaveLength(4);
    // The dock stays up until the check closes.
    expect(result.current.securityBranch?.state).toBe("docked");
  });

  it("moves a resolved security card to the right before its played Tamer enters the field", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    // A fast resolution can deliver the reveal, free play, and close together. The Tamer
    // must remain held while its security card is still travelling to the execution slot.
    rerender([ATTACK, OPP_EFFECT_REVEAL, OPP_TAIKI_PLAY, EFFECT_CHECK]);
    await advance(EFFECT_CHECK_NOTICE_AT_MS - 1);
    expect(result.current.securityBranch).not.toBeNull();
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(true);

    await advance(1);
    expect(result.current.securityBranch).not.toBeNull();
    expect(result.current.zoneShowcase?.cardId).toBe("BT10-087");
  });

  it("holds the viewer's Security Tamer off the field until its card reaches the right", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, EFFECT_REVEAL, YOUR_TAIKI_PLAY, EFFECT_CHECK]);
    await advance(EFFECT_CHECK_NOTICE_AT_MS - 1);
    // The player's regular hand plays skip the showcase, but a Security play cannot:
    // its source is still animating from the shield to the execution slot.
    expect(result.current.pendingPermanentIds.has("perm-your-taiki")).toBe(true);

    await advance(1);
    expect(result.current.securityBranch).not.toBeNull();
    // The queued field-burst is scheduled after the branch step yields back to the queue.
    await advance(0);
    expect(result.current.pendingPermanentIds.has("perm-your-taiki")).toBe(false);
    expect(result.current.permanentBursts.get("perm-your-taiki")).toMatchObject({ variant: "play" });
  });

  /* The exact payloads a live dev-scenario check delivers, captured off the wire. The
     shapes differ from a hand play: `cardPlayed` carries no `from` and no instance id, and
     the movement is a separate `cardsMoved` from security to the battle area. */
  const LIVE_ATTACK: ServerEvent = {
    kind: "attackDeclared",
    seat: 0,
    attackerPermanentId: "dev-perm-0",
    attackerCardId: "ST1-07",
    target: { kind: "player" },
  };
  const LIVE_REVEAL: ServerEvent = {
    kind: "securityRevealed",
    seat: 1,
    revealedCardId: "BT10-087",
    attackerPermanentId: "dev-perm-0",
    hasSecurityEffect: true,
    isDigimon: false,
  };
  const LIVE_PLAY: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT10-087", permanentId: "perm-1" };
  const LIVE_MOVE: ServerEvent = {
    kind: "cardsMoved",
    instanceIds: ["dev-security-1"],
    from: "security",
    to: "battleArea",
  };
  const LIVE_ON_PLAY: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "BT10-087",
    effectKey: "BT10-087/ir-6-0",
    description: "[OnPlay] Reveal top 4 and add",
    timing: "OnPlay",
    duringSecurityCheck: true,
  };
  const LIVE_REVEALS: readonly ServerEvent[] = ["BT19-051", "BT10-087", "BT19-038", "BT19-051"].map((cardId) => ({
    kind: "cardRevealed",
    seat: 1,
    cardId,
  }));

  /** The board the live client holds at that moment: the played card is already a permanent. */
  const LIVE_BOARD = {
    players: [
      { battleArea: [], trash: [], hand: [], securityCount: 5 },
      {
        battleArea: [{ permanentId: "perm-1", topCard: { instanceId: "dev-security-1", cardId: "BT10-087" } }],
        trash: [],
        hand: [],
        securityCount: 5,
      },
    ],
  } as unknown as GameState;

  /** The whole check, asserted the same way whichever shape the server batches it into. */
  async function expectLiveCheckOrder(
    result: { current: ReturnType<typeof useMatchCues> },
    rerenderBatches: () => Promise<void>,
  ) {
    await rerenderBatches();

    // Mid-clash: nothing the check caused is on screen, and the played card is held back.
    expect(result.current.sidePanels).toEqual([]);
    expect(result.current.pendingPermanentIds.has("perm-1")).toBe(true);

    // Step 2: the card docks. This stream carries no [Security]-timing notice of its own,
    // so the dock stands alone; what the card went on to do is still held.
    await advance(DOCKED_AT_MS);
    expect(result.current.securityBranch?.state).toBe("docked");
    expect(result.current.sidePanels).toEqual([]);
    expect(result.current.notices).toEqual([]);

    // Step 3: the card is seen arriving, exactly as a hand play would.
    expect(result.current.zoneShowcase?.cardId).toBe("BT10-087");
    expect(result.current.pendingPermanentIds.has("perm-1")).toBe(true);
    // The showcase holds the card up, so the "played card" panel must not repeat it.
    expect(result.current.sidePanels.some((panel) => panel.titleKey === "panel.playedCard")).toBe(false);

    // Step 4: it has landed, so the [On Play] result reads out — the panel of cards it
    // turned up first, then the clause that turned them up.
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-1")).toBe(false);
    expect(result.current.sidePanels.some((panel) => panel.titleKey === "panel.playedCard")).toBe(false);
    await advance(TIMINGS.cardBurst);
    expect(result.current.effectSources).toHaveLength(1);
    expect(result.current.notices).toHaveLength(0);
    await advance(TIMINGS.effectSourceHold);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]?.body.variant).toBe("effect");
    expect(result.current.securityBranch?.state).toBe("docked");

    const panel = result.current.sidePanels.at(-1);
    expect(panel?.titleKey).toBe("panel.revealedCards");
    expect(panel?.cards).toHaveLength(4);
    await advance(Math.max(TIMINGS.noticeLifetime, SIDE_PANEL_LIFETIME_MS) + NARRATION_TICK_MS);
    expect(result.current.sidePanels).toHaveLength(0);
  }

  it("orders a live [Security] play that arrives as one batch", async () => {
    const { result, rerender } = renderCuesOverBoard(LIVE_BOARD);
    await advance(0);

    await expectLiveCheckOrder(result, async () => {
      rerender([LIVE_ATTACK]);
      await advance(20);
      rerender([LIVE_ATTACK, LIVE_REVEAL, LIVE_PLAY, LIVE_MOVE, LIVE_ON_PLAY, ...LIVE_REVEALS]);
      await advance(20);
    });

    // The dock outlives the whole presentation: it closes only on `securityChecked`.
    expect(result.current.securityBranch?.state).toBe("docked");
  });

  it("orders the same live [Security] play when the server splits it across batches", async () => {
    const { result, rerender } = renderCuesOverBoard(LIVE_BOARD);
    await advance(0);

    await expectLiveCheckOrder(result, async () => {
      const batches: ServerEvent[][] = [
        [LIVE_ATTACK],
        [LIVE_REVEAL],
        [LIVE_PLAY],
        [LIVE_MOVE, LIVE_ON_PLAY, ...LIVE_REVEALS],
      ];
      const seen: ServerEvent[] = [];
      for (const batch of batches) {
        seen.push(...batch);
        rerender([...seen]);
        await advance(25);
      }
    });

    // The dock outlives the whole presentation: it closes only on `securityChecked`.
    expect(result.current.securityBranch?.state).toBe("docked");
  });

  /* A hidden tab (an automated screenshot run is one) puts the queue in `drain`: the
     centre-stage showcase is dropped outright, and the "played card" panel that normally
     stands in for it would name the very card the dock is holding up. */
  it("never repeats the docked card as a played-card panel when the showcase is dropped", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    try {
      const { result, rerender } = renderCuesOverBoard(LIVE_BOARD);
      await advance(0);

      rerender([LIVE_ATTACK, LIVE_REVEAL, LIVE_PLAY, LIVE_MOVE, LIVE_ON_PLAY, ...LIVE_REVEALS]);
      await advance(DOCKED_AT_MS + SHOWCASE_TOTAL_MS);

      expect(result.current.zoneShowcase).toBeNull();
      expect(result.current.sidePanels.some((panel) => panel.titleKey === "panel.playedCard")).toBe(false);
      // The reveal stays beside its clause, even when the decorative cues are drained.
      expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["effect"]);
      expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.revealedCards");
      await advance(1000);
      expect(result.current.sidePanels.at(-1)?.cards).toHaveLength(4);
    } finally {
      hidden.mockRestore();
    }
  });

  /* The batches a live match actually delivers for the same check: the server flushes on
     its own tick, so the reveal, the free play and the [On Play] resolution each arrive
     alone, 25-40 ms apart, while the clash is still on its first frame. The close only
     lands seconds later, after the bot has answered. */
  const TAIKI_PLAY_MOVE: ServerEvent = {
    kind: "cardsMoved",
    instanceIds: ["sec-taiki"],
    cardIds: ["BT10-087"],
    seat: 1,
    from: "security",
    to: "battleArea",
  };

  it("keeps the order across the separate batches a live check arrives in", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    const batches: ServerEvent[][] = [
      [ATTACK],
      [OPP_EFFECT_REVEAL],
      [OPP_TAIKI_PLAY],
      [TAIKI_PLAY_MOVE, OPP_ON_PLAY, ...TAIKI_REVEALS],
    ];
    const seen: ServerEvent[] = [];
    for (const batch of batches) {
      seen.push(...batch);
      rerender([...seen]);
      await advance(30);
    }

    // Still mid-clash: nothing the check caused has reached the screen.
    expect(result.current.notices).toEqual([]);
    expect(result.current.sidePanels).toEqual([]);
    // The played Tamer is held off the field until its arrival cue runs.
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(true);

    // Step 2: the card docks on the right.
    await advance(DOCKED_AT_MS);
    expect(result.current.securityBranch?.state).toBe("docked");
    expect(result.current.sidePanels).toEqual([]);
    // Step 3: the card is seen arriving, and the [On Play] result is still not on screen.
    expect(result.current.zoneShowcase?.cardId).toBe("BT10-087");
    expect(result.current.notices.some((notice) => notice.body.variant === "effect")).toBe(false);

    // Step 4: it has landed, so what it did reads out — the panel of revealed cards
    // first, and the clause that revealed them behind it.
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(false);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["effect"]);
    expect(result.current.securityBranch?.state).toBe("docked");

    await advance(NOTICE_ITEM_MS);
    expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.revealedCards");
    expect(result.current.sidePanels.at(-1)?.cards).toHaveLength(4);
  });

  // The permanent is rendered from state the instant its patch lands, so a card whose
  // arrival cue is still queued behind a check has to be held off the board until it plays.
  it("holds a card played by a [Security] effect off the field until its arrival cue runs", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, OPP_EFFECT_REVEAL, OPP_SECURITY_NOTICE, OPP_TAIKI_PLAY]);
    await advance(0);
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(true);
    expect(result.current.zoneShowcase).toBeNull();

    await advance(DOCKED_AT_MS + SHOWCASE_TOTAL_MS);
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(false);
  });

  // A Digimon that also resolved a [Security] effect still has a battle to show, and the
  // dock has no attacker beside it to show it against.
  it("brings a docked Digimon back to the centre for its battle", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, EFFECT_REVEAL]);
    await advance(DOCKED_AT_MS);
    expect(result.current.securityBranch?.state).toBe("docked");

    rerender([ATTACK, EFFECT_REVEAL, CHECK]);
    await advance(TIMINGS.securityDockPoll + SECURITY_DOCK_CLOSE_MS);
    await advance(0);
    expect(result.current.securityBranch).toBeNull();
    expect(result.current.securityClash?.resolution).toBe("battle");

    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  // The dock holds the one serial track every centre-stage cue shares, so a close that
  // never arrives may not wedge it: the next check has to be able to play.
  it("recovers the centre-stage track when the close never arrives", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, EFFECT_REVEAL]);
    await advance(DOCKED_AT_MS);
    expect(result.current.securityBranch?.state).toBe("docked");

    await advance(TIMINGS.securityDockMax + TIMINGS.securityDockPoll);
    expect(result.current.securityBranch).toBeNull();

    // The track is free again, so a second check plays its whole scene.
    rerender([ATTACK, EFFECT_REVEAL, SECOND_REVEAL, SECOND_CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");
  });

  // A newer check takes the board off a dock still waiting, rather than queueing behind it.
  it("lets a newer reveal take the board off a dock that is still waiting", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, EFFECT_REVEAL]);
    await advance(DOCKED_AT_MS);
    expect(result.current.securityBranch?.state).toBe("docked");

    rerender([ATTACK, EFFECT_REVEAL, SECOND_REVEAL, SECOND_CHECK]);
    await advance(0);
    expect(result.current.securityBranch).toBeNull();
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");
  });

  // An older server, and a replayed history, send no hint: the card plays the centre-stage
  // scene out and leaves on its own clock, exactly as before.
  it("falls back to the centre-stage scene when the reveal carries no hint", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, REVEAL]);
    await advance(DOCK_AT_MS);
    expect(result.current.securityBranch).toBeNull();
    expect(result.current.securityClash).not.toBeNull();

    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
    expect(result.current.securityBranch).toBeNull();
  });

  it("leaves a plain check with no branch to hold", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS);
    expect(result.current.securityBranch).toBeNull();
  });

  it("bursts where a deleted permanent stood, and only where one was measured", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([COMBAT]);
    // A permanent beaten in battle takes the claw and the shake first; the burst
    // waits behind them rather than breaking the card before it is hit.
    await advance(0);
    expect(result.current.combatImpactIds.has("perm-dead")).toBe(true);
    expect(result.current.deleteBursts).toEqual([]);

    await advance(COMBAT_IMPACT_TOTAL_MS);
    expect(result.current.combatImpactIds.size).toBe(0);
    expect(result.current.deleteBursts).toHaveLength(1);
    expect(result.current.deleteBursts[0]).toMatchObject({ x: 120 - 48, y: 80 - 48 });

    await advance(TIMINGS.cardBurst);
    expect(result.current.deleteBursts).toEqual([]);

    rerender([COMBAT, { ...COMBAT, deletedPermanentIds: ["perm-unmeasured"] }]);
    await advance(COMBAT_IMPACT_TOTAL_MS);
    expect(result.current.deleteBursts).toEqual([]);
  });

  it("plays the board battle — arrow scene, lunge, then the blow — ahead of the loser's burst", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    const declare: ServerEvent = {
      kind: "attackDeclared",
      seat: 1,
      attackerPermanentId: "perm-1",
      attackerCardId: "BT1-010",
      target: { kind: "permanent", permanentId: "perm-dead" },
      targetCardId: "BT1-020",
    };
    // The declaration and its resolution arrive in one batch, the way an
    // uncontested attack does; the scene still plays each beat on its own clock.
    rerender([declare, COMBAT]);
    await advance(0);
    expect(result.current.fieldClash).toMatchObject({
      attacker: { permanentId: "perm-1", cardId: "BT1-010" },
      defender: { permanentId: "perm-dead", cardId: "BT1-020" },
      direction: "down",
    });
    expect(result.current.attackLunge).toBeNull();
    expect(result.current.combatImpactIds.size).toBe(0);

    await advance(FIELD_CLASH_LUNGE_AT_MS);
    expect(result.current.attackLunge).toEqual({ permanentId: "perm-1", direction: "down" });

    await advance(FIELD_CLASH_IMPACT_AT_MS - FIELD_CLASH_LUNGE_AT_MS);
    expect(result.current.combatImpactIds.has("perm-dead")).toBe(true);
    expect(result.current.deleteBursts).toEqual([]);

    await advance(COMBAT_IMPACT_TOTAL_MS);
    expect(result.current.fieldClash).toBeNull();
    expect(result.current.attackLunge).toBeNull();
    expect(result.current.combatImpactIds.size).toBe(0);
    expect(result.current.deleteBursts).toHaveLength(1);
  });

  it("holds a battle's effect notices until the blow has landed", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    const declare: ServerEvent = {
      kind: "attackDeclared",
      seat: 1,
      attackerPermanentId: "perm-1",
      attackerCardId: "BT1-010",
      target: { kind: "permanent", permanentId: "perm-dead" },
      targetCardId: "BT1-020",
    };
    // The server holds `combatResolved` until the attack ends, so the deletion trigger it
    // fired reaches the client ahead of the event the battle scene is cut from.
    const triggered: ServerEvent = {
      kind: "effectTriggered",
      seat: 1,
      sourceCardId: "BT1-010",
      effectKey: "BT1-010:onDeletion",
      timing: "OnDeletion",
      description: "Draw 1 card.",
    };
    rerender([declare, triggered, COMBAT]);
    await advance(0);
    expect(result.current.notices).toEqual([]);

    await advance(FIELD_CLASH_IMPACT_AT_MS);
    expect(result.current.notices).toEqual([]);

    await advance(COMBAT_IMPACT_TOTAL_MS);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]).toMatchObject({ body: { variant: "effect", cardId: "BT1-010" } });
  });

  it("bursts for an effect that trashes a permanent off the field", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([
      {
        kind: "cardsMoved",
        instanceIds: ["perm-dead"],
        from: "battleArea",
        to: "trash",
        deletedPermanents: [{ permanentId: "perm-dead", instanceId: "perm-dead", cardId: "BT1-010", seat: 1 }],
      },
    ]);
    await advance(0);
    expect(result.current.deleteBursts).toHaveLength(1);
  });

  it("deduplicates the battle and movement cues, while prevented deletion earns neither", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([
      COMBAT,
      {
        kind: "cardsMoved",
        instanceIds: ["perm-dead"],
        from: "battleArea",
        to: "trash",
        deletedPermanents: [{ permanentId: "perm-dead", instanceId: "perm-dead", cardId: "BT1-020", seat: 1 }],
      },
    ]);
    await advance(COMBAT_IMPACT_TOTAL_MS);
    expect(result.current.deleteBursts).toHaveLength(1);
    expect(result.current.notices.filter((notice) => notice.body.variant === "deletion")).toHaveLength(1);

    await advance(NOTICE_ITEM_MS);
    rerender([{ ...COMBAT, deletedPermanentIds: [] }]);
    await advance(0);
    expect(result.current.deleteBursts).toEqual([]);
    expect(result.current.notices.filter((notice) => notice.body.variant === "deletion")).toHaveLength(0);
  });

  it.each(["combat-first", "movement-first"] as const)(
    "deduplicates deletion cues when the battle and movement arrive in separate batches (%s)",
    async (order) => {
      const { result, rerender } = renderCues();
      await advance(0);
      const movement: ServerEvent = {
        kind: "cardsMoved",
        instanceIds: ["perm-dead"],
        from: "battleArea",
        to: "trash",
        deletedPermanents: [{ permanentId: "perm-dead", instanceId: "perm-dead", cardId: "BT1-020", seat: 1 }],
      };
      if (order === "combat-first") {
        rerender([COMBAT]);
        await advance(COMBAT_IMPACT_TOTAL_MS + TIMINGS.cardBurst);
        rerender([COMBAT, movement]);
        await advance(0);
      } else {
        rerender([movement]);
        await advance(TIMINGS.cardBurst);
        rerender([movement, COMBAT]);
        await advance(COMBAT_IMPACT_TOTAL_MS);
      }
      expect(result.current.deleteBursts).toEqual([]);
    },
  );

  it("sweeps the unsuspend phase across the turn player's board", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([UNSUSPEND_PHASE]);
    await advance(0);
    expect(result.current.unsuspendSweep?.seat).toBe(0);

    await advance(TIMINGS.suspendRotate + 8 * TIMINGS.suspendStagger);
    expect(result.current.unsuspendSweep).toBeNull();
  });

  it("plays no combat animation for the history a reconnect replays", async () => {
    const { result } = renderCues([ATTACK, EFFECT_CHECK, COMBAT, UNSUSPEND_PHASE]);
    await advance(0);

    expect(result.current.securityBreak).toBeNull();
    expect(result.current.securityBranch).toBeNull();
    expect(result.current.securityClash).toBeNull();
    expect(result.current.securityHitSeat).toBeNull();
    expect(result.current.deleteBursts).toEqual([]);
    expect(result.current.unsuspendSweep).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarts a cue rather than letting the outgoing one clear the new state", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS - 100);
    const first = result.current.securityClash?.key;

    rerender([CHECK, SECOND_CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + 100);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");
    expect(result.current.securityClash?.key).not.toBe(first);

    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  it("plays one sound per cue and hands a rejection to the caller's toast", async () => {
    const onActionRejected = vi.fn<(reason: string) => void>();
    const { rerender } = renderCues([], onActionRejected);
    await advance(0);

    rerender([TURN_END, { kind: "actionRejected", intent: "playCard", reason: "notYourTurn" }]);
    await advance(0);

    expect(playSound).toHaveBeenCalledWith("turnChange");
    expect(onActionRejected).toHaveBeenCalledWith("notYourTurn");
  });
});

describe("zone-change showcases", () => {
  it("holds the opponent's card centre-screen, then reveals it on its burst", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([OPP_PLAY]);
    await advance(0);
    expect(result.current.zoneShowcase).toMatchObject({ cardId: "BT1-010" });
    // The destination stays hidden while the card is being announced.
    expect(result.current.pendingPermanentIds.has("perm-9")).toBe(true);
    expect(result.current.permanentBursts.has("perm-9")).toBe(false);

    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-9")).toBe(false);
    expect(result.current.permanentBursts.get("perm-9")).toMatchObject({ variant: "play" });

    await advance(TIMINGS.cardBurst);
    expect(result.current.permanentBursts.has("perm-9")).toBe(false);
  });

  it("skips the hold for the viewer's own play but keeps the field burst", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([YOUR_PLAY]);
    await advance(0);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.size).toBe(0);
    expect(result.current.permanentBursts.get("perm-8")).toMatchObject({ variant: "play" });
  });

  it("holds the opponent's digivolution centre-screen like a play, then bursts the stack", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([{ kind: "digivolved", seat: 1, permanentId: "perm-9", cardId: "BT1-011", mechanic: "normal" }]);
    await advance(0);
    expect(result.current.zoneShowcase).toMatchObject({ cardId: "BT1-011", kind: "digivolve" });
    // The destination stays hidden while the card is being announced.
    expect(result.current.pendingPermanentIds.has("perm-9")).toBe(true);
    expect(result.current.permanentBursts.has("perm-9")).toBe(false);

    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-9")).toBe(false);
    expect(result.current.permanentBursts.get("perm-9")).toMatchObject({ variant: "evolve" });

    await advance(TIMINGS.cardBurst);
    expect(result.current.permanentBursts.has("perm-9")).toBe(false);
  });

  it("burns over a digivolution and opens the breeding slot on a hatch", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([{ kind: "hatched", seat: 0, permanentId: "perm-egg", cardId: "ST1-01" }]);
    await advance(0);
    expect(result.current.permanentBursts.get("perm-egg")).toMatchObject({ variant: "hatch", inBreeding: true });

    rerender([
      { kind: "hatched", seat: 0, permanentId: "perm-egg", cardId: "ST1-01" },
      { kind: "digivolved", seat: 0, permanentId: "perm-egg", cardId: "ST1-03", mechanic: "normal" },
    ]);
    await advance(0);
    // Later arrivals preserve the prior beat (and any prelude queued after it).
    expect(result.current.permanentBursts.get("perm-egg")).toMatchObject({ variant: "hatch" });
    await advance(TIMINGS.cardBurst);
    expect(result.current.permanentBursts.get("perm-egg")).toMatchObject({ variant: "evolve" });
  });

  it("plays nothing for the history a reconnect replays", async () => {
    const { result } = renderCues([
      OPP_PLAY,
      { kind: "digivolved", seat: 1, permanentId: "p", cardId: "BT1-011", mechanic: "normal" },
    ]);
    await advance(0);

    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.size).toBe(0);
    expect(result.current.permanentBursts.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("never lets a security check paint over a showcase", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([OPP_PLAY]);
    await advance(0);
    expect(result.current.zoneShowcase).not.toBeNull();

    // The clash replaces the shared centre-stage track, and the showcase clears
    // itself rather than leaving the permanent hidden behind it.
    rerender([OPP_PLAY, CHECK]);
    await advance(0);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.size).toBe(0);
    expect(result.current.securityBreak).not.toBeNull();

    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash).not.toBeNull();
  });

  it("announces the opponent's play in a side panel when the showcase is dropped", async () => {
    // A hidden tab drains the queue, so the centre-stage hold never plays and the panel
    // becomes the only thing that says the opponent played anything.
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    try {
      const { result, rerender } = renderCues();
      await advance(0);

      rerender([OPP_PLAY]);
      await advance(0);

      expect(result.current.zoneShowcase).toBeNull();
      expect(result.current.sidePanels).toEqual([
        expect.objectContaining({ titleKey: "panel.playedCard", side: "opp" }),
      ]);
    } finally {
      hidden.mockRestore();
    }
  });

  it("leaves the play to the showcase alone while it can still play", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([OPP_PLAY]);
    await advance(0);

    expect(result.current.zoneShowcase).not.toBeNull();
    expect(result.current.sidePanels).toEqual([]);
  });

  it("fast-forwards the hold when the player clicks through it", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([OPP_PLAY]);
    await advance(0);
    act(() => result.current.skipAnimations());
    await advance(0);
    // Fast-forward means the end state, so the hold and the burst are both spent.
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.size).toBe(0);
    expect(result.current.permanentBursts.has("perm-9")).toBe(false);
  });
});

describe("notices", () => {
  const EFFECT: ServerEvent = {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "BT1-010",
    effectKey: "k",
    description: "Draw 1.",
    timing: "OnPlay",
  };

  it("opens nothing for the history a reconnect replays", async () => {
    const { result } = renderCues([EFFECT, { kind: "securityRecovered", seat: 0, amount: 1 }]);
    await advance(0);
    expect(result.current.notices).toEqual([]);
  });

  it("holds a live notice for its full reading time", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT]);
    await advance(0);
    expect(result.current.notices).toHaveLength(1);

    await advance(TIMINGS.noticeLifetime - 1);
    expect(result.current.notices).toHaveLength(1);
    await advance(1);
    expect(result.current.notices).toEqual([]);
  });

  it("reads a notice out on its own clock while the viewer's decision waits", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    rerender({ events: [EFFECT], decisionPending: false });
    await advance(0);
    expect(result.current.notices).toHaveLength(1);

    // The question arrives half way through the reading. Phase 3: it no longer stops the
    // clock — the barrier has already caught the presentation up, so an item on screen
    // beside a prompt is one the viewer has been given the time to read.
    await advance(TIMINGS.noticeLifetime / 2);
    rerender({ events: [EFFECT], decisionPending: true, decisionStateVersion: 1 });
    await advance(TIMINGS.noticeLifetime / 2 + NARRATION_TICK_MS);
    expect(result.current.notices).toEqual([]);
  });

  it("mirrors an effect the security check raised", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([{ kind: "securityChecked", seat: 0, revealedCardId: "BT1-010", resolution: "effect" }, EFFECT]);
    await advance(EFFECT_CHECK_NOTICE_AT_MS);
    expect(result.current.notices[0]?.fromSecurity).toBe(true);
  });

  // The reported bug: the card's effect was read out while the card itself was still
  // behind the shield, so the viewer was told what a card they had not seen just did.
  it("says nothing about the revealed card until the card has been shown", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([REVEAL, EFFECT, EFFECT_CHECK]);
    await advance(0);
    expect(result.current.notices).toEqual([]);

    // Still nothing while the shield is breaking, while the two cards are held, and
    // while the revealed card is still sliding to the side it reads out from.
    await advance(EFFECT_CHECK_NOTICE_AT_MS - 1);
    expect(result.current.notices).toEqual([]);

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.securityBranch).not.toBeNull();
  });

  const CHECK_OWNED_EFFECT: ServerEvent = { ...EFFECT, duringSecurityCheck: true };

  // The reported bug's other half: the effect a check fires is announced before the
  // `securityChecked` that closes the check, and a decision inside the effect delivers
  // the two in separate batches — so the effect used to read out ahead of the clash.
  // The reveal is what it waits for now, not the close: the card is on screen long
  // before the server is done with it.
  it("holds a mid-check effect announced ahead of its check until the reveal has played", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([REVEAL, CHECK_OWNED_EFFECT]);
    await advance(REVEAL_EXIT_AT_MS - 1);
    expect(result.current.notices).toEqual([]);

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]?.fromSecurity).toBe(true);
  });

  it("reads a check-owned effect that arrives while the scene is still playing after the reveal", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([REVEAL]);
    await advance(TIMINGS.securityArm);

    rerender([REVEAL, CHECK_OWNED_EFFECT]);
    await advance(REVEAL_EXIT_AT_MS - TIMINGS.securityArm - 1);
    expect(result.current.notices).toEqual([]);

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
  });

  // With the reveal announced on its own event there is never a mid-check effect ahead of
  // the card it describes, so one that arrives with no reveal holding the screen has
  // nothing left to wait for.
  it("raises a mid-check effect at once when no reveal is holding the screen", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([CHECK_OWNED_EFFECT]);
    await advance(0);
    expect(result.current.notices).toHaveLength(1);
  });

  it("still says what a superseded check did before the next one takes the screen", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([REVEAL, EFFECT]);
    await advance(TIMINGS.securityArm);
    expect(result.current.notices).toEqual([]);

    // A second strike replaces the centre of the screen. A dropped animation is a
    // shrug; a dropped effect description is information the viewer never gets back.
    rerender([REVEAL, EFFECT, SECOND_REVEAL]);
    await advance(0);
    expect(result.current.notices).toHaveLength(1);
  });

  it("lets the showcase finish before an On Play notice talks over it", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([OPP_PLAY, EFFECT]);
    await advance(0);
    expect(result.current.notices).toEqual([]);

    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.notices).toHaveLength(1);
    // The notice is raised late, so its reading clock starts late too.
    await advance(TIMINGS.noticeLifetime - 1);
    expect(result.current.notices).toHaveLength(1);
  });

  const XROS_PLAY: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT10-066", permanentId: "perm-7" };

  it("calls out a DigiXros the moment the played card lands", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([XROS_PLAY]);
    await advance(0);
    expect(result.current.notices[0]?.body).toEqual({ variant: "keyword", keyword: "digiXros", cardId: "BT10-066" });
  });

  it("stays quiet for an ordinary play", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([YOUR_PLAY]);
    await advance(0);
    expect(result.current.notices).toEqual([]);
  });

  it("calls out nothing for the history a reconnect replays", async () => {
    const { result } = renderCues([XROS_PLAY, TURN_END]);
    await advance(0);
    expect(result.current.notices).toEqual([]);
    expect(result.current.turnTransition).toBeNull();
  });

  it("raises a rejection notice on demand", async () => {
    const { result } = renderCues();
    await advance(0);

    act(() => result.current.raiseRejection("Not enough memory."));
    expect(result.current.notices[0]?.body).toEqual({ variant: "rejection", reason: "Not enough memory." });
  });
});

describe("server-named signals", () => {
  it("riffles exactly the pile the server said it shuffled", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([SHUFFLE]);
    await advance(1);
    expect([...result.current.deckRiffles]).toEqual(["1:eggDeck"]);
    await advance(TIMINGS.deckRiffle + 10);
    expect(result.current.deckRiffles.size).toBe(0);
  });

  it("no longer riffles for cards merely returning to a deck", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([RETURN_TO_DECK]);
    await advance(1);
    expect(result.current.deckRiffles.size).toBe(0);
  });

  it("carries the server's DP compare onto the clash scene, in either direction", async () => {
    const { result, rerender } = renderCues([ATTACK]);
    await advance(0);
    rerender([ATTACK, { ...CHECK, battle: { attackerDeleted: false, securityDigimonDeleted: true } } as ServerEvent]);
    await advance(SECURITY_BREAK_TOTAL_MS + 1);
    expect(result.current.securityClash?.loser).toEqual({ attacker: false, revealed: true });
  });

  it("leaves the clash outcome unmarked when the server published no compare", async () => {
    const { result, rerender } = renderCues([ATTACK]);
    await advance(0);
    rerender([ATTACK, CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + 1);
    expect(result.current.securityClash?.loser).toBeUndefined();
  });
});

describe("security a card effect trashes", () => {
  it("plays one scene per card, naming each card the stack lost", async () => {
    const { result, rerender } = renderCuesOverBoard(TRASHED_SECURITY_BOARD);
    await advance(0);
    rerender([SECURITY_TRASHED]);

    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
    expect(result.current.securityClash?.cause).toBe("destruction");

    // The second card gets the whole sequence again rather than sharing the first's scene.
    await advance(SECURITY_DESTROY_TOTAL_MS + SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");

    await advance(SECURITY_DESTROY_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  // Lamiamon (BT24-016) trashes the opponent's top security card and then fires several
  // triggers at once: the dialog asking their order must not cover the trashed card.
  it("keeps a question the same batch carries behind the last card's scene", async () => {
    const feed = batchFeed();
    const { result, rerender: rerenderBatches } = renderHook(
      ({ batches, decisionPending }: { batches: readonly ServerBatch[]; decisionPending: boolean }) =>
        useMatchCues({
          narrationLimit: 3,
          batches,
          state: TRASHED_SECURITY_BOARD,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          decisionPending,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { batches: [] as readonly ServerBatch[], decisionPending: false } },
    );
    const rerender = ({ events, decisionPending }: { events: readonly ServerEvent[]; decisionPending: boolean }) =>
      rerenderBatches({ batches: feed(events), decisionPending });
    await advance(0);
    expect(result.current.securityRevealPending).toBe(false);

    rerender({ events: [SECURITY_TRASHED], decisionPending: true });
    await advance(0);
    expect(result.current.securityRevealPending).toBe(true);

    const bothCardsMs = 2 * (SECURITY_BREAK_TOTAL_MS + SECURITY_DESTROY_TOTAL_MS);
    await advance(bothCardsMs - 1);
    expect(result.current.securityRevealPending).toBe(true);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");

    await advance(1);
    expect(result.current.securityRevealPending).toBe(false);
    expect(result.current.securityClash).toBeNull();
  });

  it("breaks the shield of the stack that lost the cards, once per card", async () => {
    const { result, rerender } = renderCuesOverBoard(TRASHED_SECURITY_BOARD);
    await advance(0);
    rerender([SECURITY_TRASHED]);

    await advance(TIMINGS.securityArm);
    expect(result.current.securityBreak).toMatchObject({ seat: 1, phase: "break" });

    // The same shield arms and breaks again for the second card rather than staying broken
    // through both, so a stack losing several cards is seen losing each one.
    const first = result.current.securityBreak?.key;
    await advance(SECURITY_BREAK_TOTAL_MS + SECURITY_DESTROY_TOTAL_MS - TIMINGS.securityArm);
    expect(result.current.securityBreak).toMatchObject({ seat: 1, phase: "arm" });
    expect(result.current.securityBreak?.key).not.toBe(first);

    await advance(TIMINGS.securityArm);
    expect(result.current.securityBreak).toMatchObject({ seat: 1, phase: "break" });
  });

  // The reported bug: a chained effect (Medusamon's Petrification tokens) delivers one
  // trash per event batch, and each new batch's shield break replaced the centre of the
  // screen — cancelling the previous card's still-playing scene.
  it("queues a later batch's trash behind the scene the first batch is still playing", async () => {
    const trashOf = (instanceId: string, cardId: string): ServerEvent => ({
      kind: "cardsMoved",
      instanceIds: [instanceId],
      from: "security",
      to: "trash",
      cardIds: [cardId],
      seat: 1,
    });
    const first = trashOf("i-a", "BT1-010");
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([first]);
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");

    // The second trash arrives while the first card's scene is on screen.
    rerender([first, trashOf("i-b", "BT1-011")]);
    await advance(0);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");

    // The first scene runs its full clock, and only then does the second play.
    await advance(SECURITY_DESTROY_TOTAL_MS + SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");

    await advance(SECURITY_DESTROY_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  // The other half of the reported bug: the movement event outruns the state patch, so
  // the board index cannot name the card yet. The event's own identities carry the scene.
  it("plays the scene from the event's identities before the board has the card", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([
      {
        kind: "cardsMoved",
        instanceIds: ["i-not-in-any-index"],
        from: "security",
        to: "trash",
        cardIds: ["BT1-010"],
        seat: 1,
      },
    ]);
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
    expect(result.current.securityClash?.cause).toBe("destruction");
  });
});

describe("the figure a shield shows", () => {
  it("keeps the card the board dropped until the reveal has put it on screen", async () => {
    const { result, rerender } = renderCuesOverBoard(STACKED_SECURITY_BOARD);
    await advance(0);
    rerender([ATTACK, REVEAL]);

    // The shield breaks first; the stack is still five while it does.
    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.heldSecurityCounts.get(0)).toBe(5);

    await advance(CLASH_REVEAL_SHOWN_AT_MS);
    expect(result.current.heldSecurityCounts.get(0)).toBeUndefined();
  });

  it("drops one figure per card an effect trashes, as each card breaks", async () => {
    const { result, rerender } = renderCuesOverBoard(STACKED_SECURITY_BOARD);
    await advance(0);
    rerender([SECURITY_TRASHED]);

    await advance(SECURITY_BREAK_TOTAL_MS);
    expect(result.current.heldSecurityCounts.get(1)).toBe(5);

    // The first card breaks, so the shield gives up one — the second is still owed.
    await advance(SECURITY_DESTROY_OUTCOME_AT_MS);
    expect(result.current.heldSecurityCounts.get(1)).toBe(4);

    await advance(SECURITY_DESTROY_TOTAL_MS - SECURITY_DESTROY_OUTCOME_AT_MS + SECURITY_BREAK_TOTAL_MS);
    expect(result.current.heldSecurityCounts.get(1)).toBe(4);

    await advance(SECURITY_DESTROY_OUTCOME_AT_MS);
    expect(result.current.heldSecurityCounts.get(1)).toBeUndefined();
  });

  it("hands the figure back when a newer scene takes the board off the one holding it", async () => {
    const { result, rerender } = renderCuesOverBoard(STACKED_SECURITY_BOARD);
    await advance(0);
    rerender([ATTACK, REVEAL]);
    await advance(TIMINGS.securityArm);
    expect(result.current.heldSecurityCounts.get(0)).toBe(5);

    rerender([ATTACK, REVEAL, SECOND_REVEAL, SECOND_CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS);
    expect(result.current.heldSecurityCounts.get(0)).toBeUndefined();
  });
});

describe("security gains", () => {
  function boardWithSecurity(you: number, opp: number): GameState {
    return {
      players: [
        { battleArea: [], trash: [], hand: [], securityCount: you },
        { battleArea: [], trash: [], hand: [], securityCount: opp },
      ],
    } as unknown as GameState;
  }

  /** The same hook, with the board as a second input so a patch can land between batches. */
  function renderCuesOverGrowingBoard(initialState: GameState) {
    const feed = batchFeed();
    const view = renderHook(
      ({ batches, state }: { batches: readonly ServerBatch[]; state: GameState }) =>
        useMatchCues({
          narrationLimit: 3,
          batches,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { batches: [] as readonly ServerBatch[], state: initialState } },
    );
    return {
      ...view,
      rerender: ({ events, state }: { events: readonly ServerEvent[]; state: GameState }) =>
        view.rerender({ batches: feed(events), state }),
    };
  }

  it("flies the card onto the stack and announces a growth an effect caused", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({ events: [], state: boardWithSecurity(6, 5) });
    await advance(0);
    expect(result.current.securityFlights.has(VIEWER)).toBe(true);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]).toMatchObject({ side: "you", body: { variant: "securityGain", amount: 1 } });

    await advance(TIMINGS.securityFlight);
    expect(result.current.securityFlights.has(VIEWER)).toBe(false);
  });

  it("announces the opponent's growth on the opponent's side", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({ events: [], state: boardWithSecurity(5, 7) });
    await advance(0);
    expect(result.current.securityFlights.has(1)).toBe(true);
    expect(result.current.notices[0]).toMatchObject({ side: "opp", body: { variant: "securityGain", amount: 2 } });
  });

  it("leaves a growth a recovery announced to the recovery", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({
      events: [{ kind: "securityRecovered", seat: VIEWER, amount: 1 }],
      state: boardWithSecurity(6, 5),
    });
    await advance(0);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["recovery"]);
  });

  it("announces an add the movement names a seat for, even when the count never moves", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    // "Place 1 card from your hand as the bottom security card. Then, trash your top
    // security card" (BT24-016): the opponent's stack is the same size after the patch.
    rerender({
      events: [
        { kind: "cardsMoved", instanceIds: ["placed"], from: "various", to: "security", seat: 1 },
        { kind: "cardsMoved", instanceIds: ["lost"], from: "security", to: "trash", cardIds: ["BT1-010"], seat: 1 },
      ],
      state: boardWithSecurity(5, 5),
    });
    await advance(0);
    expect(result.current.securityFlights.has(1)).toBe(true);
    expect(result.current.notices.map((notice) => [notice.side, notice.body])).toEqual([
      ["opp", { variant: "securityGain", amount: 1 }],
    ]);

    // The panel of what the same effect trashed follows it.
    await advance(NOTICE_ITEM_MS);
    expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.trashedCards");
  });

  it("narrates a named add once, not again when its growth lands", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({
      events: [{ kind: "cardsMoved", instanceIds: ["placed"], from: "various", to: "security", seat: VIEWER }],
      state: boardWithSecurity(6, 5),
    });
    await advance(0);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["securityGain"]);
  });

  it("does not let a claim that met no growth swallow the next growth the count shows", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({
      events: [{ kind: "cardsMoved", instanceIds: ["placed"], from: "various", to: "security", seat: 1 }],
      state: boardWithSecurity(5, 5),
    });
    await advance(0);
    rerender({
      events: [
        { kind: "cardsMoved", instanceIds: ["placed"], from: "various", to: "security", seat: 1 },
        { kind: "cardsMoved", instanceIds: ["unnamed"], from: "deck", to: "security" },
      ],
      state: boardWithSecurity(5, 6),
    });
    await advance(0);
    // Both independent security additions remain visible.
    expect(result.current.notices.map((notice) => [notice.side, notice.body.variant])).toEqual([
      ["opp", "securityGain"],
      ["opp", "securityGain"],
    ]);
    await advance(NOTICE_ITEM_MS);
    expect(result.current.notices).toEqual([]);
  });

  it("says nothing when the stack shrinks", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({ events: [], state: boardWithSecurity(4, 5) });
    await advance(0);
    expect(result.current.securityFlights.size).toBe(0);
    expect(result.current.notices).toEqual([]);
  });

  it("treats the dealt opening stack as a baseline, not a growth", async () => {
    const { result } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);
    expect(result.current.securityFlights.size).toBe(0);
    expect(result.current.notices).toEqual([]);
  });

  it("deals the opening stack card by card instead of gaining five at once", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(0, 0));
    await advance(0);

    rerender({ events: [], state: boardWithSecurity(5, 5) });
    await advance(0);
    // Both shields start the deal empty and count up with the cards.
    expect(result.current.securityDealCounts.get(VIEWER)).toBe(0);
    expect(result.current.securityDealCounts.get(1)).toBe(0);
    expect(result.current.notices).toEqual([]);
    expect(result.current.securityFlights.size).toBe(0);

    await advance(TIMINGS.securityDealStagger * 2);
    expect(result.current.securityDealCounts.get(VIEWER)).toBe(2);

    await advance(TIMINGS.securityDealStagger * 3 + TIMINGS.securityFlight);
    // The deal hands the shields back to the live count once it has finished.
    expect(result.current.securityDealCounts.size).toBe(0);
    expect(result.current.notices).toEqual([]);
  });

  it("gains rather than deals when a stack grows after the opening", async () => {
    const { result, rerender } = renderCuesOverGrowingBoard(boardWithSecurity(5, 5));
    await advance(0);

    rerender({ events: [], state: boardWithSecurity(6, 5) });
    await advance(0);
    expect(result.current.securityDealCounts.size).toBe(0);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["securityGain"]);
  });
});

describe("a DigiXros play whose [On Play] deletes, and the question it raises", () => {
  /* BT19-070 Kimeramon: DigiXrosed onto the opponent's board, its [On Play] deletes one of
     the viewer's Digimon, and the deletion arms a trigger the viewer must answer. Every
     event of it arrives in ONE batch, which is why the beats have to be sequenced here. */
  const KIMERAMON = "BT19-070";
  const XROS_PLAY: ServerEvent = {
    kind: "cardPlayed",
    seat: 1,
    cardId: KIMERAMON,
    permanentId: "perm-kimera",
    mechanic: "digiXros",
  };
  const XROS_MATERIALS: ServerEvent = {
    kind: "cardsMoved",
    instanceIds: ["mat-1", "mat-2"],
    from: "battleArea",
    to: "digivolutionCards",
  };
  const KIMERA_ON_PLAY: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: KIMERAMON,
    effectKey: "onPlay",
    description: "Delete 1 of your opponent's Digimon.",
    timing: "On Play",
  };
  /** The viewer's Digimon leaving the field. `perm-dead` is the only anchor the test board measures. */
  const VIEWER_DELETED: ServerEvent = {
    kind: "cardsMoved",
    instanceIds: ["perm-dead"],
    from: "battleArea",
    to: "trash",
    deletedPermanents: [{ permanentId: "perm-dead", instanceId: "perm-dead", cardId: "BT1-010", seat: 0 }],
  };
  const XROS_BATCH: readonly ServerEvent[] = [XROS_PLAY, XROS_MATERIALS, KIMERA_ON_PLAY, VIEWER_DELETED];

  /** When the [On Play] clause is read out: once the card has had the screen to itself. */
  const CLAUSE_AT_MS = SHOWCASE_TOTAL_MS;
  /** When what the clause did reaches the board. */
  const DELETION_AT_MS = CLAUSE_AT_MS + TIMINGS.effectSourceHold;
  /** When the viewer's own prompt may finally open. */
  const PROMPT_AT_MS = DELETION_AT_MS + TIMINGS.cardShatter;

  it("plays the call-out, the clause and the deletion as three beats before the prompt opens", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    // The server asks the moment it has resolved: the question arrives with the batch it
    // was raised in, and its barrier holds the prompt until that batch is read out.
    rerender({ events: XROS_BATCH, decisionPending: true, decisionStateVersion: 1 });
    await advance(0);

    // Beat one: the card centre-stage, and "DigiXros!" beside it — and nothing else.
    expect(result.current.zoneShowcase?.cardId).toBe(KIMERAMON);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["keyword"]);
    expect(result.current.deleteBursts).toEqual([]);
    expect(result.current.decisionBarrierPending).toBe(true);
    // The board the prompt will open over is the board this batch produced.
    expect(result.current.presentedStateVersion).toBe(1);

    // Beat two: the clause is queued behind the call-out — the two never share the corner.
    await advance(CLAUSE_AT_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.decisionBarrierPending).toBe(true);

    // Beat three: the consequence, with the shatter drawn from the card that stood there.
    await advance(DELETION_AT_MS - CLAUSE_AT_MS);
    expect(result.current.deleteBursts).toHaveLength(1);

    // Only then is the viewer asked about it.
    await advance(PLAY_LEAD_IN_BUDGET_MS);
    expect(result.current.decisionBarrierPending).toBe(false);

    // And once the last item has been read out, the board is the live one again.
    await advance(NOTICE_ITEM_MS * 3);
    expect(result.current.presentedStateVersion).toBeUndefined();
  });

  it("never holds the prompt longer than the budget, whatever the beats do", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    rerender({ events: XROS_BATCH, decisionPending: true, decisionStateVersion: 1 });
    await advance(0);
    expect(result.current.decisionBarrierPending).toBe(true);
    expect(PROMPT_AT_MS).toBeLessThanOrEqual(PLAY_LEAD_IN_BUDGET_MS);

    // The budget is a wall clock, so a queue that never reaches those steps still hands
    // the board back.
    await advance(PLAY_LEAD_IN_BUDGET_MS);
    expect(result.current.decisionBarrierPending).toBe(false);
  });

  it("keeps the queued items moving while the viewer decides", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    rerender({ events: XROS_BATCH, decisionPending: true, decisionStateVersion: 1 });
    await advance(0);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["keyword"]);

    // A pending decision no longer stops the reading clock: the call-out is read, it
    // leaves, and the clause behind it takes the corner — all while the question is open.
    await advance(NOTICE_ITEM_MS + 1);
    expect(result.current.notices.map((notice) => notice.body.variant)).toEqual(["effect", "deletion"]);
    expect(result.current.notices[0]?.body).toMatchObject({ cardId: KIMERAMON, timing: "On Play" });
  });

  it("raises no barrier for a question about a board already read out", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);

    rerender({ events: XROS_BATCH, decisionPending: false });
    await advance(NOTICE_ITEM_MS * 4);
    expect(result.current.presentedStateVersion).toBeUndefined();

    // The question is about the batch the screen has already finished: nothing to wait for.
    rerender({ events: XROS_BATCH, decisionPending: true, decisionStateVersion: 1 });
    await advance(0);
    expect(result.current.decisionBarrierPending).toBe(false);
  });
});

/* Recent records remain visible independently of the action presentation. */
describe("the narration feed", () => {
  const effectOf = (seat: 0 | 1, cardId: string): ServerEvent => ({
    kind: "effectTriggered",
    seat,
    sourceCardId: cardId,
    effectKey: cardId,
    description: `Draw ${cardId}.`,
    timing: "OnPlay",
  });
  const yourEffect = (id: string) => effectOf(0, id);
  const theirEffect = (id: string) => effectOf(1, id);
  function cards(narration: ReadonlyMap<string, { notice?: { body: unknown } }>) {
    return [...narration.values()].map((item) => (item.notice?.body as { cardId?: string })?.cardId);
  }

  it("shows three same-side clauses together without holding the board or input", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([yourEffect("BT1-001"), yourEffect("BT1-002"), yourEffect("BT1-003")]);
    await advance(0);
    expect(cards(result.current.narration)).toEqual(["BT1-001", "BT1-002", "BT1-003"]);
    expect(result.current.presenting).toBe(false);
    expect(result.current.presentedStateVersion).toBeUndefined();
    await advance(TIMINGS.noticeLifetime);
    expect(result.current.narration.size).toBe(0);
  });

  /* The BT25-008 play of 2026-09-16: the clause that passed the turn was raised, and the
     five ribbons the turn change queues covered it for 5.3s while its six-second clock ran
     out underneath them. The clause reads first, then the ribbon takes the screen and it. */
  it("reads the clause that passed the turn before the ribbon, and clears it as the ribbon opens", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([yourEffect("BT1-001")]);
    await advance(0);
    expect(cards(result.current.narration)).toEqual(["BT1-001"]);

    rerender([
      yourEffect("BT1-001"),
      { kind: "phaseChanged", phase: "End", turnSeat: 0, turnCount: 1 },
      { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 1 },
    ]);
    await advance(TIMINGS.phaseBannerNoticeRead - 200);
    expect(result.current.phaseBanner).toBeNull();
    expect(cards(result.current.narration)).toEqual(["BT1-001"]);

    await advance(200 + 16);
    expect(result.current.phaseBanner?.phase).toBe("End");
    expect(result.current.narration.size).toBe(0);
  });

  it("does not hold a ribbon for a clause the same phase raised after it", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([
      { kind: "phaseChanged", phase: "End", turnSeat: 0, turnCount: 1 },
      { kind: "turnEnded", endingSeat: 0, nextSeat: 1, turnCount: 1 },
    ]);
    await advance(16);
    expect(result.current.phaseBanner?.phase).toBe("End");
  });

  it("expires each batch independently without resetting the earlier record", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([yourEffect("BT1-001")]);
    await advance(1000);
    rerender([yourEffect("BT1-001"), yourEffect("BT1-002")]);
    await advance(0);
    expect(cards(result.current.narration)).toEqual(["BT1-001", "BT1-002"]);
    await advance(TIMINGS.noticeLifetime - 1000);
    expect(cards(result.current.narration)).toEqual(["BT1-002"]);
    await advance(1000);
    expect(result.current.narration.size).toBe(0);
  });

  // Each corner is a FIFO of its own, so a moment only ever displaces an earlier moment of
  // the same side. Folded into the phone's single slot, the two sides share that one queue.
  it.each([true, false])(
    "keeps only the newest record per slot, which the phone folds into one (portrait=%s)",
    async (portrait) => {
      const feed = batchFeed();
      const view = renderHook(
        (batches: readonly ServerBatch[]) =>
          useMatchCues({
            batches,
            state: undefined,
            viewerSeat: VIEWER,
            mulliganOpen: false,
            collapseNarration: portrait,
            anchors,
            onActionRejected: vi.fn<(reason: string) => void>(),
          }),
        { initialProps: feed([]) },
      );
      await advance(0);
      view.rerender(feed([yourEffect("BT1-001"), yourEffect("BT1-002"), theirEffect("BT1-009")]));
      await advance(0);
      // All three are clauses, so they all read out of the one text column. It holds two, so
      // the oldest falls off; the phone's folded slot queues them instead of dropping any.
      const expected = portrait ? ["BT1-001", "BT1-002", "BT1-009"] : ["BT1-002", "BT1-009"];
      expect(cards(view.result.current.narration)).toEqual(expected);
      await advance(TIMINGS.effectAnnounce);
      expect(cards(view.result.current.narration)).toEqual(expected);
      expect(view.result.current.narrationLock).toBe(false);
      expect(view.result.current.presenting).toBe(false);
    },
  );

  it("dismisses the selected record without dismissing its neighbors or changing their clocks", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    expect(result.current.advanceNarration()).toBe(false);
    rerender([yourEffect("BT1-001"), yourEffect("BT1-002"), theirEffect("BT1-009")]);
    await advance(1000);
    const middle = [...result.current.narration.keys()][1]!;
    act(() => {
      expect(result.current.advanceNarration(middle)).toBe(true);
    });
    expect(cards(result.current.narration)).toEqual(["BT1-001", "BT1-009"]);
    expect(result.current.advanceNarration(middle)).toBe(false);
    await advance(TIMINGS.noticeLifetime - 1000);
    expect(result.current.narration.size).toBe(0);
  });

  it("keeps repeated activations of the same card independently dismissible", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([yourEffect("BT1-001"), yourEffect("BT1-001")]);
    await advance(0);
    expect(result.current.narration.size).toBe(2);
    act(() => {
      result.current.advanceNarration();
    });
    expect(cards(result.current.narration)).toEqual(["BT1-001"]);
  });

  it("clears visible records on skip and accepts subsequent batches", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([yourEffect("BT1-001"), theirEffect("BT1-009")]);
    await advance(0);
    act(() => result.current.skipAnimations());
    await advance(0);
    expect(result.current.narration.size).toBe(0);
    rerender([yourEffect("BT1-001"), theirEffect("BT1-009"), yourEffect("BT1-002")]);
    await advance(0);
    expect(cards(result.current.narration)).toEqual(["BT1-002"]);
  });

  it("does not wait for reading timers to open a decision, and keeps expiring records", async () => {
    const { result, rerender } = renderCuesAwaitingAnswer();
    await advance(0);
    rerender({ events: [yourEffect("BT1-001"), yourEffect("BT1-002")], decisionPending: false });
    await advance(0);
    expect(cards(result.current.narration)).toEqual(["BT1-001", "BT1-002"]);
    rerender({
      events: [yourEffect("BT1-001"), yourEffect("BT1-002")],
      decisionPending: true,
      decisionStateVersion: 1,
    });
    await advance(0);
    expect(result.current.decisionBarrierPending).toBe(false);
    await advance(TIMINGS.noticeLifetime);
    expect(result.current.narration.size).toBe(0);
  });

  it("shows refusals immediately, with their own lifetime", async () => {
    const { result, rerender } = renderCues();
    await advance(0);
    rerender([theirEffect("BT1-009")]);
    await advance(0);
    act(() => result.current.raiseRejection("Not enough memory."));
    expect(result.current.rejection?.body).toEqual({ variant: "rejection", reason: "Not enough memory." });
    expect(cards(result.current.narration)).toEqual(["BT1-009"]);
    await advance(TIMINGS.noticeLifetime);
    expect(result.current.rejection).not.toBeNull();
    await advance(REJECTION_LIFETIME_MS - TIMINGS.noticeLifetime);
    expect(result.current.rejection).toBeNull();
  });

  it("does not replay reconnect history or leave reading timers behind", async () => {
    const { result } = renderCues([yourEffect("BT1-001"), theirEffect("BT1-009")]);
    await advance(0);
    expect(result.current.narration.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

/* The board the screen renders from: the snapshot of the batch the queue is presenting,
   not whatever the server has since resolved (docs/presentation-queue-plan.md 3.2). */
describe("the presented revision", () => {
  const OPP_TRIGGER: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "BT1-010",
    effectKey: "onDeletion",
    description: "Draw 1 card.",
    timing: "On Deletion",
  };

  it("stays on the battle's own revision while a later trigger waits its turn", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    // Batch 1: the attack and the battle that deletes the viewer's Digimon.
    rerender([ATTACK, COMBAT]);
    await advance(0);
    expect(result.current.presentedStateVersion).toBe(1);

    // Batch 2 arrives while batch 1 is still being read out. The board does NOT jump to
    // it: the loser is still on the board the battle produced until its trigger is read.
    rerender([ATTACK, COMBAT, OPP_TRIGGER]);
    await advance(0);
    expect(result.current.presentedStateVersion).toBe(1);

    // Once the battle finishes, the trigger can remain readable over the live board.
    await advance(FIELD_CLASH_TOTAL_MS + COMBAT_IMPACT_TOTAL_MS);
    expect(result.current.presentedStateVersion).toBeUndefined();
    expect(result.current.notices.length).toBeGreaterThan(0);

    // Read out: the board is the live board again.
    await advance(NOTICE_ITEM_MS * 2);
    expect(result.current.presentedStateVersion).toBeUndefined();
  });

  it("holds the reveal's revision through a check the server has not closed yet", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([ATTACK, REVEAL]);
    await advance(0);
    expect(result.current.presentedStateVersion).toBe(1);

    // The close is a batch of its own; the reveal is still on screen, so the board stays
    // on the revision the reveal belongs to.
    rerender([ATTACK, REVEAL, CHECK]);
    await advance(REVEAL_SHOWN_AT_MS);
    expect(result.current.presentedStateVersion).toBe(1);
  });

  it("presents a DNA digivolve over its own board and then hands it back", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([
      {
        kind: "cardPlayed",
        seat: 1,
        cardId: "BT1-010",
        permanentId: "perm-dna",
        mechanic: "dna",
        sourceCardIds: ["BT1-011", "BT1-012"],
      },
    ]);
    await advance(0);
    expect(result.current.presentedStateVersion).toBe(1);

    await advance(PRESENTED_BOARD_BUDGET_MS);
    expect(result.current.presentedStateVersion).toBeUndefined();
  });

  it("presents the live board while a reconnect replays its history", async () => {
    // The first pass is history: it leaves the final state behind without playing a frame,
    // so there is no moment to hold the board on.
    const { result } = renderCues([ATTACK, REVEAL, CHECK, OPP_TRIGGER]);
    await advance(0);
    expect(result.current.presentedStateVersion).toBeUndefined();

    await advance(NOTICE_ITEM_MS * 2);
    expect(result.current.presentedStateVersion).toBeUndefined();
  });
});

it("presents every security check in a single server batch in order", async () => {
  const { result, rerender } = renderCues();
  await advance(0);
  rerender([ATTACK, REVEAL, CHECK, SECOND_REVEAL, SECOND_CHECK]);
  await advance(SECURITY_BREAK_TOTAL_MS);
  expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
  await advance(CLASH_TOTAL_MS + SECURITY_BREAK_TOTAL_MS);
  expect(result.current.securityClash?.revealed.cardId).toBe("BT1-011");
  await advance(CLASH_TOTAL_MS);
  expect(result.current.securityClash).toBeNull();
});

describe("triggered effect source prelude", () => {
  const trigger: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "BT1-010",
    effectKey: "prelude",
    timing: "On Deletion",
    description: "Draw 1.",
  };

  it("finishes the deletion before flashing the trash source and then publishing the toast", async () => {
    const { result, rerender } = renderCuesOverBoard({
      ...TRASHED_SECURITY_BOARD,
      players: [
        TRASHED_SECURITY_BOARD.players[0],
        {
          ...TRASHED_SECURITY_BOARD.players[1],
          battleArea: [{ permanentId: "surviving-copy", topCard: { cardId: "BT1-010", instanceId: "survivor" } }],
        },
      ],
    } as unknown as GameState);
    await advance(0);
    rerender([
      {
        kind: "cardsMoved",
        instanceIds: ["sec-1"],
        from: "battleArea",
        to: "trash",
        deletedPermanents: [{ permanentId: "perm-dead", instanceId: "sec-1", cardId: "BT1-010", seat: 1 }],
      },
      trigger,
    ]);
    await advance(0);
    expect(result.current.deleteBursts).toHaveLength(1);
    expect(result.current.effectSources).toHaveLength(0);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
    await advance(Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter));
    expect(result.current.deleteBursts).toHaveLength(0);
    expect(result.current.effectSources).toMatchObject([{ site: { zone: "trash", instanceId: "sec-1" } }]);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
    await advance(TIMINGS.effectSourceHold - 1);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
    await advance(1);
    expect(result.current.effectSources).toHaveLength(0);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(1);
    await advance(TIMINGS.noticeLifetime - 1);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(1);
    await advance(1);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
  });

  it("preserves both triggered notices when an automatic second evolution arrives", async () => {
    const board = {
      ...TRASHED_SECURITY_BOARD,
      players: [
        TRASHED_SECURITY_BOARD.players[0],
        {
          ...TRASHED_SECURITY_BOARD.players[1],
          battleArea: [{ permanentId: "perm-9", topCard: { cardId: "BT1-010", instanceId: "arrived" } }],
        },
      ],
    } as unknown as GameState;
    const { result, rerender } = renderCuesOverBoard(board);
    const arrival: ServerEvent = {
      kind: "digivolved",
      seat: 1,
      permanentId: "perm-9",
      cardId: "BT1-010",
      mechanic: "normal",
    };
    const first = { ...trigger, timing: "When Digivolving", effectKey: "first", description: "First effect." };
    const second = { ...first, effectKey: "second", description: "Second effect." };
    await advance(0);
    rerender([arrival, first]);
    await advance(100);
    rerender([arrival, first, { ...arrival }, second]);
    await advance(SHOWCASE_TOTAL_MS + TIMINGS.cardBurst - 100 + TIMINGS.effectSourceHold);
    expect(result.current.notices.map((notice) => notice.body)).toContainEqual(
      expect.objectContaining({ description: "First effect." }),
    );
    await advance(SHOWCASE_TOTAL_MS + TIMINGS.cardBurst + TIMINGS.effectSourceHold);
    expect(result.current.notices.map((notice) => notice.body)).toEqual([
      expect.objectContaining({ description: "First effect." }),
      expect.objectContaining({ description: "Second effect." }),
    ]);
  });

  it("publishes without a visual wait when the tab is hidden", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    try {
      const { result, rerender } = renderCuesOverBoard(TRASHED_SECURITY_BOARD);
      await advance(0);
      rerender([trigger]);
      await advance(0);
      expect(result.current.effectSources).toHaveLength(0);
      expect(result.current.notices).toHaveLength(1);
      expect(result.current.decisionAnimationsPending).toBe(false);
    } finally {
      hidden.mockRestore();
    }
  });

  it("waits for the Main Phase banner before highlighting its source", async () => {
    const { result, rerender } = renderCuesOverBoard(TRASHED_SECURITY_BOARD);
    await advance(0);
    rerender([
      { kind: "phaseChanged", phase: Phase.Main, turnSeat: 1, turnCount: 2 },
      { ...trigger, timing: "Start of Main Phase" },
    ]);
    await advance(0);
    expect(result.current.phaseBanner).not.toBeNull();
    expect(result.current.effectSources).toHaveLength(0);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
    await advance(TIMINGS.phaseBanner + TIMINGS.phaseBannerGap + 16);
    expect(result.current.effectSources).toHaveLength(1);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
    await advance(TIMINGS.effectSourceHold);
    expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(1);
  });

  it.each(["On Play", "When Digivolving"])(
    "waits for the %s arrival before highlighting its source",
    async (timing) => {
      const { result, rerender } = renderCuesOverBoard({
        ...TRASHED_SECURITY_BOARD,
        players: [
          TRASHED_SECURITY_BOARD.players[0],
          {
            ...TRASHED_SECURITY_BOARD.players[1],
            battleArea: [{ permanentId: "perm-9", topCard: { cardId: "BT1-010", instanceId: "arrived" } }],
          },
        ],
      } as unknown as GameState);
      await advance(0);
      const arrival: ServerEvent =
        timing === "On Play"
          ? OPP_PLAY
          : {
              kind: "digivolved",
              seat: 1,
              permanentId: "perm-9",
              cardId: "BT1-010",
              mechanic: "normal",
            };
      rerender([arrival, { ...trigger, timing }]);
      await advance(0);
      expect(result.current.effectSources).toHaveLength(0);
      expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
      await advance(SHOWCASE_TOTAL_MS + TIMINGS.cardBurst);
      expect(result.current.effectSources).toHaveLength(1);
      expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(0);
      await advance(TIMINGS.effectSourceHold);
      expect(result.current.notices.filter((notice) => notice.body.variant === "effect")).toHaveLength(1);
    },
  );
});

it("shows Analog Youth's On Play before its trash result across server batches", async () => {
  const board = {
    players: [
      { battleArea: [], hand: [], trash: [] },
      {
        battleArea: [{ permanentId: "perm-4", topCard: { cardId: "EX1-066", instanceId: "s1-42" } }],
        hand: [],
        trash: [
          { instanceId: "s1-47", cardId: "P-205" },
          { instanceId: "s1-31", cardId: "BT18-019" },
        ],
      },
    ],
  } as unknown as GameState;
  const reports: import("@aegis/shared").PresentationReport[] = [];
  const { result, rerender } = renderCuesOverBoard(board, undefined, (report) => reports.push(report));
  const play: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "EX1-066", permanentId: "perm-4" };
  const effect: ServerEvent = {
    kind: "effectTriggered",
    seat: 1,
    sourceCardId: "EX1-066",
    sourcePermanentId: "perm-4",
    sourceInstanceId: "s1-42",
    effectKey: "EX1-066/ir-6-0",
    timing: "OnPlay",
    description: "Reveal top 3 and add",
  };
  rerender([play]);
  await advance(12);
  rerender([play, effect]);
  await advance(0);
  expect(result.current.effectSources).toHaveLength(0);
  expect(result.current.notices).toHaveLength(0);
  await advance(2348);
  rerender([play, effect, { kind: "cardsMoved", instanceIds: ["s1-47", "s1-31"], from: "various", to: "trash" }]);
  await advance(0);
  expect(result.current.sidePanels.filter((panel) => panel.titleKey === "panel.trashedCards")).toHaveLength(0);
  await advance(SHOWCASE_TOTAL_MS + TIMINGS.cardBurst + TIMINGS.effectSourceHold - 2360);
  expect(
    result.current.notices.some((notice) => notice.body.variant === "effect" && notice.body.cardId === "EX1-066"),
  ).toBe(true);
  await advance(TIMINGS.effectAnnounce);
  expect(result.current.sidePanels.some((panel) => panel.titleKey === "panel.trashedCards")).toBe(true);
  const arrivalReport = reports.find((report) => report.stepId.startsWith("zone-change-") && report.phase === "queued");
  expect(reports.find((report) => report.stepId.startsWith("burst-") && report.phase === "started")).toMatchObject({
    batchId: arrivalReport?.batchId,
    stateVersion: 1,
  });
});

it("plays the security battle when the server closes the check after its reveal has exited", async () => {
  const { result, rerender } = renderCues();
  rerender([ATTACK]);
  await advance(10000);
  rerender([ATTACK, { ...REVEAL, isDigimon: true, hasSecurityEffect: false, attackerDP: 2000, securityCardDP: 4000 }]);
  await advance(10000);
  expect(result.current.securityClash).toBeNull();
  rerender([
    ATTACK,
    { ...REVEAL, isDigimon: true, hasSecurityEffect: false, attackerDP: 2000, securityCardDP: 4000 },
    {
      ...CHECK,
      battle: { attackerDP: 2000, securityCardDP: 4000, attackerDeleted: true, securityDigimonDeleted: true },
    },
  ]);
  await advance(0);
  expect(result.current.securityClash?.resolution).toBe("battle");
});

it("highlights the field host for a Succession effect even with another copy of the level 6 in hand", async () => {
  const board = {
    players: [
      {
        battleArea: [
          {
            permanentId: "succession-host",
            topCard: { cardId: "BT26-087", instanceId: "level-7" },
            stack: [{ cardId: "BT26-016", instanceId: "level-6-source" }],
          },
        ],
        hand: [{ cardId: "BT26-016", instanceId: "level-6-in-hand" }],
        trash: [],
      },
      { battleArea: [], hand: [], trash: [] },
    ],
  } as unknown as GameState;
  const { result, rerender } = renderCuesOverBoard(board);
  rerender([
    {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "BT26-016",
      effectKey: "succession-when-digivolving",
      description: "[When Digivolving] Delete 1 of your opponent's Digimon.",
      timing: "WhenDigivolving",
    },
  ]);
  await advance(0);
  expect(result.current.effectSources).toMatchObject([
    {
      cardId: "BT26-016",
      site: { zone: "field", permanentId: "succession-host" },
    },
  ]);
});

it("highlights each physical Digimon when identical cards resolve their start-of-main effects", async () => {
  const board = {
    players: [
      {
        battleArea: [
          { permanentId: "first-hyokomon", topCard: { cardId: "BT26-009", instanceId: "first-copy" } },
          { permanentId: "second-hyokomon", topCard: { cardId: "BT26-009", instanceId: "second-copy" } },
        ],
        hand: [],
        trash: [],
      },
      { battleArea: [], hand: [], trash: [] },
    ],
  } as unknown as GameState;
  const { result, rerender } = renderCuesOverBoard(board);
  const first = {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "BT26-009",
    sourceInstanceId: "first-copy",
    sourcePermanentId: "first-hyokomon",
    effectKey: "start-main",
    description: "[Start of Your Main Phase] Draw 1 card.",
    timing: "StartOfYourMainPhase",
  } as unknown as ServerEvent;
  const second = {
    ...first,
    sourceInstanceId: "second-copy",
    sourcePermanentId: "second-hyokomon",
  } as unknown as ServerEvent;
  rerender([first]);
  await advance(0);
  expect(result.current.effectSources).toMatchObject([{ site: { zone: "field", permanentId: "first-hyokomon" } }]);
  await advance(10000);
  rerender([first, second]);
  await advance(0);
  expect(result.current.effectSources).toMatchObject([{ site: { zone: "field", permanentId: "second-hyokomon" } }]);
});

it("keeps the activation glow when a decision suppresses its duplicate toast", async () => {
  const board = {
    players: [
      {
        battleArea: [{ permanentId: "second", topCard: { cardId: "BT26-009", instanceId: "copy-2" } }],
        hand: [],
        trash: [],
      },
      { battleArea: [], hand: [], trash: [] },
    ],
  } as unknown as GameState;
  const { result, rerender } = renderCuesOverBoard(board);
  act(() => result.current.dismissOwnEffectNotice("BT26-009"));
  rerender([
    {
      kind: "effectTriggered",
      seat: 0,
      sourceCardId: "BT26-009",
      sourcePermanentId: "second",
      sourceInstanceId: "copy-2",
      effectKey: "start-main",
      description: "[Start of Your Main Phase] Draw 1 card.",
      timing: "StartOfYourMainPhase",
    },
  ]);
  await advance(0);
  expect(result.current.effectSources).toMatchObject([{ site: { zone: "field", permanentId: "second" } }]);
  await advance(TIMINGS.effectSourceHold);
  expect(result.current.notices).toHaveLength(0);
});

it("highlights the opponent's Plutomon when its All Turns hand-trash effect activates", async () => {
  const board = {
    players: [
      { battleArea: [], hand: [], trash: [] },
      {
        battleArea: [{ permanentId: "plutomon", topCard: { cardId: "BT26-059", instanceId: "plutomon-card" } }],
        hand: [],
        trash: [],
      },
    ],
  } as unknown as GameState;
  const { result, rerender } = renderCuesOverBoard(board);
  rerender([
    {
      kind: "effectTriggered",
      seat: 1,
      sourceCardId: "BT26-059",
      sourceInstanceId: "plutomon-card",
      sourcePermanentId: "plutomon",
      effectKey: "hand-trash",
      timing: "whenHandTrashed",
      printedTiming: "AllTurns",
      description: "whenHandTrashed",
    },
  ]);
  await advance(0);
  expect(result.current.effectSources).toMatchObject([
    { seat: 1, cardId: "BT26-059", site: { zone: "field", permanentId: "plutomon" } },
  ]);
});

describe("Taiki hand-play reveal on a single narration slot", () => {
  it("keeps all four cards readable alongside their On Play clause", async () => {
    const feed = batchFeed();
    const state = {
      players: [
        { battleArea: [], trash: [], hand: [] },
        {
          battleArea: [{ permanentId: "perm-4", topCard: { instanceId: "s1-40", cardId: "BT10-087" } }],
          trash: [],
          hand: [],
        },
      ],
    } as unknown as GameState;
    const { result, rerender } = renderHook(
      (batches: readonly ServerBatch[]) =>
        useMatchCues({
          narrationLimit: 1,
          batches,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: [] as readonly ServerBatch[] },
    );
    await advance(0);
    const play: ServerEvent = {
      kind: "cardPlayed",
      seat: 1,
      cardId: "BT10-087",
      artId: "BT10-087",
      permanentId: "perm-4",
    };
    rerender(feed([play]));
    await advance(10);
    const effect: ServerEvent = {
      kind: "effectTriggered",
      seat: 1,
      sourceCardId: "BT10-087",
      sourceInstanceId: "s1-40",
      sourcePermanentId: "perm-4",
      effectKey: "BT10-087/ir-6-0",
      description: "[OnPlay] Reveal top 4 and add",
      timing: "OnPlay",
    };
    const cardIds = ["BT19-014", "BT8-095", "AD1-006", "BT19-051"];
    const reveals: ServerEvent[] = cardIds.map((cardId) => ({ kind: "cardRevealed", seat: 1, cardId, artId: cardId }));
    rerender(feed([play, effect, ...reveals]));
    await advance(SHOWCASE_TOTAL_MS + TIMINGS.cardBurst + TIMINGS.effectSourceHold);
    expect(result.current.sidePanels.at(-1)?.cards.map((card) => card.cardId)).toEqual(cardIds);
    expect(result.current.notices.at(-1)?.body).toMatchObject({ variant: "effect", cardId: "BT10-087" });
    await advance(1000);
    expect(result.current.sidePanels.at(-1)?.cards.map((card) => card.cardId)).toEqual(cardIds);
  });
});

it("presents Imperial's late security consequence before the next turn phases", async () => {
  const board = {
    players: [
      {
        battleArea: [{ permanentId: "imperial", topCard: { cardId: "AD1-024", instanceId: "imperial-card" } }],
        hand: [],
        trash: [],
      },
      { battleArea: [], hand: [], trash: [] },
    ],
  } as unknown as GameState;
  const reports: import("@aegis/shared").PresentationReport[] = [];
  const { result, rerender } = renderCuesOverBoard(board, undefined, (report) => reports.push(report));
  const imperial: ServerEvent = {
    kind: "effectTriggered",
    seat: 0,
    sourceCardId: "AD1-024",
    sourcePermanentId: "imperial",
    sourceInstanceId: "imperial-card",
    effectKey: "entry-response",
    timing: "AllTurns",
    description: "Suspend, then unsuspend.",
  };
  rerender([ATTACK, REVEAL]);
  await advance(100);
  rerender([ATTACK, REVEAL, imperial]);
  await advance(0);
  rerender([
    ATTACK,
    REVEAL,
    imperial,
    CHECK,
    TURN_END,
    { kind: "phaseChanged", phase: Phase.Main, turnSeat: 0, turnCount: 4 },
  ]);
  let sourceBeforePhase = false;
  let observedPhase = false;
  for (let tick = 0; tick < 200; tick++) {
    await advance(100);
    if (reports.some((report) => report.phase === "shown" && report.sourceCardId === "AD1-024"))
      sourceBeforePhase = true;
    if (result.current.phaseBanner !== null) {
      observedPhase = true;
      break;
    }
  }
  expect(observedPhase).toBe(true);
  expect(sourceBeforePhase).toBe(true);
  const source = reports.findIndex((report) => report.phase === "shown" && report.sourceCardId === "AD1-024");

  expect(source).toBeGreaterThanOrEqual(0);

  expect(reports[source]).toMatchObject({ stateVersion: 2 });
});
