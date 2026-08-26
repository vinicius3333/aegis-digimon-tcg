// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import {
  CLASH_OUTCOME_AT_MS,
  CLASH_TOTAL_MS,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_TOTAL_MS,
  SHOWCASE_TOTAL_MS,
  TIMINGS,
  COMBAT_IMPACT_TOTAL_MS,
} from "./timings";

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
const CHECK: ServerEvent = { kind: "securityChecked", seat: 0, revealedCardId: "BT1-010", resolution: "battle" };
const SECOND_CHECK: ServerEvent = { ...CHECK, revealedCardId: "BT1-011" };
const EFFECT_CHECK: ServerEvent = { ...CHECK, resolution: "effect" };
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

    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS - 1);
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
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS);
    expect(result.current.notices[0]?.fromSecurity).toBe(true);
  });

  // The reported bug: the card's effect was read out while the card itself was still
  // behind the shield, so the viewer was told what a card they had not seen just did.
  it("says nothing about the revealed card until the card has been shown", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT_CHECK, EFFECT]);
    await advance(0);
    expect(result.current.notices).toEqual([]);

    // Still nothing while the shield is breaking and while the two cards are held.
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS - 1);
    expect(result.current.notices).toEqual([]);
    expect(result.current.securityBranch).toBeNull();

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.securityBranch).not.toBeNull();
  });

  const CHECK_OWNED_EFFECT: ServerEvent = { ...EFFECT, duringSecurityCheck: true };

  // The reported bug's other half: the server announces a check's effect BEFORE the
  // `securityChecked` that closes the check, and a decision inside the effect delivers
  // the two in separate batches — so the effect used to read out ahead of the clash.
  it("holds a mid-check effect announced ahead of its check until the reveal has played", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([CHECK_OWNED_EFFECT]);
    await advance(0);
    expect(result.current.notices).toEqual([]);

    rerender([CHECK_OWNED_EFFECT, EFFECT_CHECK]);
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS - 1);
    expect(result.current.notices).toEqual([]);

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]?.fromSecurity).toBe(true);
  });

  it("reads a check-owned effect that arrives while the scene is still playing after the reveal", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT_CHECK]);
    await advance(TIMINGS.securityArm);

    rerender([EFFECT_CHECK, CHECK_OWNED_EFFECT]);
    await advance(SECURITY_BREAK_TOTAL_MS + CLASH_TOTAL_MS - TIMINGS.securityArm - 1);
    expect(result.current.notices).toEqual([]);

    await advance(1);
    expect(result.current.notices).toHaveLength(1);
  });

  it("flushes a held mid-check effect at turn end when no check ever closes it", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([CHECK_OWNED_EFFECT]);
    await advance(0);
    expect(result.current.notices).toEqual([]);

    rerender([CHECK_OWNED_EFFECT, TURN_END]);
    await advance(0);
    expect(result.current.notices).toHaveLength(1);
  });

  it("still says what a superseded check did before the next one takes the screen", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([EFFECT_CHECK, EFFECT]);
    await advance(TIMINGS.securityArm);
    expect(result.current.notices).toEqual([]);

    // A second strike replaces the centre of the screen. A dropped animation is a
    // shrug; a dropped effect description is information the viewer never gets back.
    rerender([EFFECT_CHECK, EFFECT, SECOND_CHECK]);
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
