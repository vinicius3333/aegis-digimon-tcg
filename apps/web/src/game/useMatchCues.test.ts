// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
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
  SHOWCASE_TOTAL_MS,
  TIMINGS,
  COMBAT_IMPACT_TOTAL_MS,
} from "./timings";

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
};

function renderCues(initialEvents: readonly ServerEvent[] = [], onActionRejected = vi.fn<(reason: string) => void>()) {
  const view = renderHook(
    (events: readonly ServerEvent[]) =>
      useMatchCues({ events, state: undefined, viewerSeat: VIEWER, mulliganOpen: false, anchors, onActionRejected }),
    { initialProps: initialEvents },
  );
  return { ...view, onActionRejected };
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
function renderCuesOverBoard(state: GameState) {
  return renderHook(
    (events: readonly ServerEvent[]) =>
      useMatchCues({
        events,
        state,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        anchors,
        onActionRejected: vi.fn<(reason: string) => void>(),
      }),
    { initialProps: [] as readonly ServerEvent[] },
  );
}

/** The same hook, with the question the server is waiting on as a second input. */
function renderCuesAwaitingAnswer() {
  return renderHook(
    ({ events, decisionPending }: { events: readonly ServerEvent[]; decisionPending: boolean }) =>
      useMatchCues({
        events,
        state: undefined,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        decisionPending,
        anchors,
        onActionRejected: vi.fn(),
      }),
    { initialProps: { events: [] as readonly ServerEvent[], decisionPending: false } },
  );
}

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

    // Step 4: the card has landed, so what it did reads out.
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(false);
    expect(result.current.notices).toHaveLength(2);
    expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.revealedCards");
    expect(result.current.sidePanels.at(-1)?.cards).toHaveLength(4);
    // The dock stays up until the check closes.
    expect(result.current.securityBranch?.state).toBe("docked");
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

    // Step 4: it has landed, so the [On Play] result reads out.
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-1")).toBe(false);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]?.body.variant).toBe("effect");
    expect(result.current.sidePanels.some((panel) => panel.titleKey === "panel.playedCard")).toBe(false);
    const panel = result.current.sidePanels.at(-1);
    expect(panel?.titleKey).toBe("panel.revealedCards");
    expect(panel?.cards).toHaveLength(4);
    expect(result.current.securityBranch?.state).toBe("docked");
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
      // What the [On Play] turned up still reads out, on the clock it is raised at.
      expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.revealedCards");
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

    // Step 4: it has landed, so what it did reads out.
    await advance(SHOWCASE_TOTAL_MS);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.has("perm-taiki")).toBe(false);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.sidePanels.at(-1)?.titleKey).toBe("panel.revealedCards");
    expect(result.current.sidePanels.at(-1)?.cards).toHaveLength(4);
    expect(result.current.securityBranch?.state).toBe("docked");
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

    rerender([{ kind: "cardsMoved", instanceIds: ["perm-dead"], from: "battleArea", to: "trash" }]);
    await advance(0);
    expect(result.current.deleteBursts).toHaveLength(1);
  });

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

  it("skips the hold for the opponent's digivolution but keeps the field burst", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([{ kind: "digivolved", seat: 1, permanentId: "perm-9", cardId: "BT1-011", mechanic: "normal" }]);
    await advance(0);
    expect(result.current.zoneShowcase).toBeNull();
    expect(result.current.pendingPermanentIds.size).toBe(0);
    expect(result.current.permanentBursts.get("perm-9")).toMatchObject({ variant: "evolve" });
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
    // The second burst replaces the first on the permanent's own track.
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
    const { result, rerender } = renderHook(
      ({ events, decisionPending }: { events: readonly ServerEvent[]; decisionPending: boolean }) =>
        useMatchCues({
          events,
          state: TRASHED_SECURITY_BOARD,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          decisionPending,
          anchors,
          onActionRejected: vi.fn(),
        }),
      { initialProps: { events: [] as readonly ServerEvent[], decisionPending: false } },
    );
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
    return renderHook(
      ({ events, state }: { events: readonly ServerEvent[]; state: GameState }) =>
        useMatchCues({
          events,
          state,
          viewerSeat: VIEWER,
          mulliganOpen: false,
          anchors,
          onActionRejected: vi.fn<(reason: string) => void>(),
        }),
      { initialProps: { events: [] as readonly ServerEvent[], state: initialState } },
    );
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
    expect(result.current.notices.map((notice) => [notice.side, notice.body.variant])).toEqual([
      ["opp", "securityGain"],
      ["opp", "securityGain"],
    ]);
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
});
