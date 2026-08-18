import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import {
  advanceOpponentFeed,
  emptyOpponentFeedState,
  enqueueOpponentActions,
  hasOpenCombatPrompt,
  opponentActionFromEvent,
  type OpponentActionItem,
} from "./opponentActionFeed";

function event(value: unknown): ServerEvent {
  return value as ServerEvent;
}

function item(id: string): OpponentActionItem {
  return {
    id,
    kind: "played",
    cardId: "BT1-010",
    titleKey: "feed.opponentPlayed",
    titleParams: { card: id },
    durationMs: 2800,
  };
}

describe("opponent action narration", () => {
  it("maps public opponent actions and ignores the viewer's own actions", () => {
    expect(
      opponentActionFromEvent(event({ kind: "cardPlayed", seat: 1, cardId: "BT1-010" }), 0, "event-1"),
    ).toMatchObject({
      id: "event-1",
      kind: "played",
      cardId: "BT1-010",
      titleKey: "feed.opponentPlayed",
      titleParams: { card: "Agumon" },
    });

    expect(opponentActionFromEvent(event({ kind: "cardPlayed", seat: 0, cardId: "BT1-010" }), 0, "event-2")).toBeNull();
  });

  it("uses actor metadata instead of guessing from the current board", () => {
    expect(
      opponentActionFromEvent(
        event({ kind: "digivolved", seat: 1, permanentId: "gone", cardId: "AD1-001" }),
        0,
        "event-3",
      ),
    ).toMatchObject({ kind: "digivolved", titleParams: { card: "Greymon" } });

    expect(
      opponentActionFromEvent(
        event({
          kind: "attackDeclared",
          seat: 1,
          attackerPermanentId: "gone",
          attackerCardId: "BT1-010",
          target: { kind: "player" },
        }),
        0,
        "event-4",
      ),
    ).toMatchObject({ kind: "attack", titleKey: "feed.attackedYourSecurity" });

    expect(
      opponentActionFromEvent(
        event({
          kind: "attackDeclared",
          seat: 1,
          attackerPermanentId: "attacker",
          attackerCardId: "BT1-010",
          target: { kind: "permanent", permanentId: "target" },
          targetCardId: "AD1-001",
        }),
        0,
        "event-5",
      ),
    ).toMatchObject({
      titleKey: "feed.attackedDigimon",
      titleParams: { card: "Agumon", target: "Greymon" },
    });
  });

  it("keeps only real combat prompts blocking until combat narration closes them", () => {
    expect(
      hasOpenCombatPrompt([
        event({
          kind: "attackDeclared",
          seat: 1,
          attackerPermanentId: "a",
          attackerCardId: "BT1-010",
          target: { kind: "player" },
        }),
        event({ kind: "counterWindowOpened", attackerPermanentId: "a", defendingSeat: 0, eligibleCounters: [] }),
        event({ kind: "blockWindowOpened", attackerPermanentId: "a", eligibleBlockerIds: [] }),
      ]),
    ).toBe(false);
    expect(
      hasOpenCombatPrompt([
        event({
          kind: "counterWindowOpened",
          attackerPermanentId: "a",
          defendingSeat: 0,
          eligibleCounters: [{ instanceId: "ace", effectKey: "counter", description: "Counter" }],
        }),
      ]),
    ).toBe(true);
    expect(
      hasOpenCombatPrompt([
        event({ kind: "blockWindowOpened", attackerPermanentId: "a", eligibleBlockerIds: ["b"] }),
        event({ kind: "blockDeclined", attackerPermanentId: "a" }),
      ]),
    ).toBe(false);
    expect(
      hasOpenCombatPrompt([
        event({
          kind: "counterWindowOpened",
          attackerPermanentId: "a",
          defendingSeat: 0,
          eligibleCounters: [{ instanceId: "ace", effectKey: "counter", description: "Counter" }],
        }),
        event({ kind: "counterResolved", attackerPermanentId: "a", activated: true }),
      ]),
    ).toBe(false);
    expect(
      hasOpenCombatPrompt([
        event({ kind: "barrierPrompt", permanentId: "a" }),
        event({ kind: "barrierResolved", permanentId: "a", accepted: true }),
      ]),
    ).toBe(false);
    expect(
      hasOpenCombatPrompt([
        event({ kind: "evadePrompt", permanentId: "a" }),
        event({ kind: "evadeResolved", permanentId: "a", accepted: false }),
      ]),
    ).toBe(false);
  });

  it("never exposes raw timing enum names", () => {
    expect(
      opponentActionFromEvent(
        event({
          kind: "effectResolved",
          seat: 1,
          sourceCardId: "BT1-010",
          effectKey: "on-play",
          description: "Draw 1.",
          timing: "OnPlay",
        }),
        0,
        "effect",
      )?.titleParams,
    ).toEqual({ card: "Agumon" });
  });

  it("shows only the chosen card for an opponent's public reveal", () => {
    expect(
      opponentActionFromEvent(
        event({ kind: "cardRevealed", seat: 1, cardId: "BT1-045", sourceCardId: "EX3-029" }),
        0,
        "reveal",
      ),
    ).toMatchObject({
      id: "reveal",
      kind: "revealed",
      cardId: "BT1-045",
      titleKey: "feed.cardRevealedBy",
      titleParams: { card: "Tsukaimon", source: "Airdramon" },
    });
    expect(
      opponentActionFromEvent(
        event({ kind: "cardRevealed", seat: 0, cardId: "BT1-045", sourceCardId: "EX3-029" }),
        0,
        "own-reveal",
      ),
    ).toBeNull();
  });

  it("keeps generic engine narration out of the transient feed", () => {
    expect(
      opponentActionFromEvent(
        event({ kind: "cardsMoved", instanceIds: ["i1"], from: "hand", to: "trash" }),
        0,
        "event-5",
      ),
    ).toBeNull();
    expect(
      opponentActionFromEvent(event({ kind: "memoryChanged", from: 1, to: -2, reason: "play" }), 0, "event-6"),
    ).toBeNull();
  });
});

describe("opponent action queue", () => {
  it("shows the newest opponent action immediately and moves the previous one into history", () => {
    const first = enqueueOpponentActions(emptyOpponentFeedState(), [item("one")]);
    const synchronized = enqueueOpponentActions(first, [item("two")]);

    expect(synchronized.current?.id).toBe("two");
    expect(synchronized.trail.map(({ id }) => id)).toEqual(["one"]);
    expect(synchronized.pending).toEqual([]);
  });

  it("keeps a bot burst synchronized to its newest action", () => {
    const queued = enqueueOpponentActions(
      emptyOpponentFeedState(),
      [item("one"), item("two"), item("three"), item("four"), item("five")],
      2,
    );

    expect(queued.current?.id).toBe("five");
    expect(queued.pending).toEqual([]);
    expect(queued.trail.map(({ id }) => id)).toEqual(["four", "three"]);

    const next = advanceOpponentFeed(queued, 2);
    expect(next.current).toBeUndefined();
    expect(next.trail.map(({ id }) => id)).toEqual(["five", "four"]);
    expect(next.pending).toEqual([]);
  });

  it("coalesces the matching combat result without swallowing another attack", () => {
    const attack = opponentActionFromEvent(
      event({
        kind: "attackDeclared",
        seat: 1,
        attackerPermanentId: "attacker-1",
        attackerCardId: "BT1-010",
        target: { kind: "permanent", permanentId: "target" },
      }),
      0,
      "attack",
    );
    const resolved = opponentActionFromEvent(
      event({
        kind: "combatResolved",
        seat: 1,
        attackerPermanentId: "attacker-1",
        deletedPermanentIds: ["target"],
      }),
      0,
      "result",
    );

    const state = enqueueOpponentActions(emptyOpponentFeedState(), [attack!, resolved!]);
    expect(state.current?.id).toBe("attack");
    expect(state.current?.detailKey).toBe("feed.combatDeleted");
    expect(state.pending).toEqual([]);
  });
});
