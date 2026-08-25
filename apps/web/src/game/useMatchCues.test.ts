// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { useMatchCues, type MatchCueAnchors } from "./useMatchCues";
import { CLASH_TOTAL_MS, SHOWCASE_TOTAL_MS, TIMINGS } from "./timings";

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
const TURN_END: ServerEvent = { kind: "turnEnded", endingSeat: 1, nextSeat: 0, turnCount: 4 };
const OPP_PLAY: ServerEvent = { kind: "cardPlayed", seat: 1, cardId: "BT1-010", permanentId: "perm-9" };
const YOUR_PLAY: ServerEvent = { kind: "cardPlayed", seat: 0, cardId: "BT1-011", permanentId: "perm-8" };

/** Nothing is laid out in jsdom, so a draw flight measures zero and never launches. */
const anchors: MatchCueAnchors = {
  board: { current: null },
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
    expect(result.current.securityClash?.revealed.cardId).toBe("BT1-010");
    expect(result.current.securityHitSeat).toBe(0);

    // Each cue keeps its own clock: the lunge is over long before the clash is.
    await advance(TIMINGS.attackLunge);
    expect(result.current.attackLunge).toBeNull();
    expect(result.current.securityHitSeat).toBe(0);
    await advance(TIMINGS.securityHit - TIMINGS.attackLunge);
    expect(result.current.securityHitSeat).toBeNull();
    expect(result.current.securityClash).not.toBeNull();

    await advance(CLASH_TOTAL_MS);
    expect(result.current.securityClash).toBeNull();
  });

  it("restarts a cue rather than letting the outgoing one clear the new state", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([CHECK]);
    await advance(CLASH_TOTAL_MS - 100);
    const first = result.current.securityClash?.key;

    rerender([CHECK, SECOND_CHECK]);
    await advance(100);
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
    expect(result.current.zoneShowcase).toMatchObject({ kind: "play", cardId: "BT1-010" });
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

  it("burns over a digivolution and opens the breeding slot on a hatch", async () => {
    const { result, rerender } = renderCues();
    await advance(0);

    rerender([{ kind: "hatched", seat: 0, permanentId: "perm-egg", cardId: "ST1-01" }]);
    await advance(0);
    expect(result.current.permanentBursts.get("perm-egg")).toMatchObject({ variant: "hatch", inBreeding: true });

    rerender([
      { kind: "hatched", seat: 0, permanentId: "perm-egg", cardId: "ST1-01" },
      { kind: "digivolved", seat: 0, permanentId: "perm-egg", cardId: "ST1-03" },
    ]);
    await advance(0);
    // The second burst replaces the first on the permanent's own track.
    expect(result.current.permanentBursts.get("perm-egg")).toMatchObject({ variant: "evolve" });
  });

  it("plays nothing for the history a reconnect replays", async () => {
    const { result } = renderCues([OPP_PLAY, { kind: "digivolved", seat: 1, permanentId: "p", cardId: "BT1-011" }]);
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
    expect(result.current.securityClash).not.toBeNull();
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
    kind: "effectResolved",
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
    await advance(0);
    expect(result.current.notices[0]?.fromSecurity).toBe(true);
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

  it("raises a rejection notice on demand", async () => {
    const { result } = renderCues();
    await advance(0);

    act(() => result.current.raiseRejection("Not enough memory."));
    expect(result.current.notices[0]?.body).toEqual({ variant: "rejection", reason: "Not enough memory." });
  });

  it("opens the selection panel from the viewer's own answer", async () => {
    const { result } = renderCues();
    await advance(0);

    act(() => result.current.showSelection(["BT1-001", "BT1-002"]));
    expect(result.current.sidePanels[0]?.titleKey).toBe("panel.selectedCards");
    expect(result.current.sidePanels[0]?.cards).toHaveLength(2);
  });
});
