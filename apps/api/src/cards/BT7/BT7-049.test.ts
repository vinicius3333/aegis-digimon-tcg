import type { ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle, type CardSpec, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import "../EX5/EX5-042.js";
import "./BT7-049.js";
import "./BT7-054.js";

describe("BT7-049 MameTyramon", () => {
  it("digivolves into a revealed green level 6 without paying its cost when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-049", as: "mame" }],
          deck: [{ card: "BT7-054", as: "ancient" }, "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mame").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mame").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("mame").stack.some((card) => card.cardId === "BT7-049")).toBe(true);
  });

  it("digivolves only this Digimon when another friendly Digimon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-049", as: "mame" },
            { card: "BT1-010", as: "other" },
          ],
          deck: [{ card: "BT7-054", as: "ancient" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mame").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mame").topCard?.instanceId === s.inst("ancient").instanceId);

    expect(s.perm("mame").topCard?.instanceId).toBe(s.inst("ancient").instanceId);
    expect(s.perm("other").topCard?.cardId).toBe("BT1-010");
  });
});

describe("BT7-049 MameTyramon — KB Q&A rulings", () => {
  function attackWithMameTyramon(deck: CardSpec[], options: SetupEngineOptions) {
    const eventLog: ServerEvent[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-049", as: "mame" }], deck },
        1: { security: ["BT1-009"] },
      },
      { ...options, onEvent: (event) => eventLog.push(event) },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mame").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    return { s, eventLog };
  }

  const cardIdsOf = (cards: { cardId: string }[]): string[] => cards.map((card) => card.cardId);

  const indexOfEvent = (eventLog: ServerEvent[], matches: (event: ServerEvent) => boolean): number =>
    eventLog.findIndex(matches);

  it("may reveal and then decline to digivolve, returning all revealed cards to the bottom (Q1587)", async () => {
    const { s, eventLog } = attackWithMameTyramon(
      [
        { card: "BT7-054", as: "ancient" },
        { card: "BT1-010" },
        { card: "BT1-011" },
        { card: "BT1-012", as: "unrevealed" },
      ],
      { declinePrompts: ["MameTyramon"] },
    );
    await settle(() => eventLog.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-049"));

    const digivolveOffer = s.decisions.find((decision) => decision.req.promptText === "MameTyramon");
    expect(digivolveOffer?.req.options).toMatchObject({
      min: 0,
      max: 1,
      candidateInstanceIds: [s.inst("ancient").instanceId],
    });
    expect(s.perm("mame").topCard?.cardId).toBe("BT7-049");
    expect(s.state.players[0]!.hand).toHaveLength(0);
    const deck = s.state.players[0]!.deck;
    expect(deck[0]?.instanceId).toBe(s.inst("unrevealed").instanceId);
    expect(cardIdsOf(deck.slice(1)).sort()).toEqual(["BT1-010", "BT1-011", "BT7-054"]);
  });

  it("performs the digivolution bonus draw from the unrevealed cards before returning the rest (Q1588)", async () => {
    const { s, eventLog } = attackWithMameTyramon(
      [
        { card: "BT7-054", as: "ancient" },
        { card: "BT1-010", as: "revealedFirst" },
        { card: "BT1-011", as: "revealedSecond" },
        { card: "BT1-012", as: "unrevealed" },
      ],
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() => eventLog.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-049"));

    const digivolved = indexOfEvent(eventLog, (event) => event.kind === "digivolved" && event.cardId === "BT7-054");
    const bonusDraw = indexOfEvent(
      eventLog,
      (event) => event.kind === "cardsMoved" && event.from === "deck" && event.to === "hand",
    );
    const returnedToBottom = indexOfEvent(
      eventLog,
      (event) => event.kind === "cardsMoved" && event.to === "deckBottom",
    );
    expect(digivolved).toBeGreaterThanOrEqual(0);
    expect(bonusDraw).toBeGreaterThan(digivolved);
    expect(returnedToBottom).toBeGreaterThan(bonusDraw);

    expect(s.perm("mame").topCard?.instanceId).toBe(s.inst("ancient").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("unrevealed").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("revealedFirst").instanceId, s.inst("revealedSecond").instanceId].sort(),
    );
  });

  it("returns the remaining revealed cards before the new card's [When Digivolving] resolves (Q1589)", async () => {
    const { s, eventLog } = attackWithMameTyramon(
      [
        { card: "EX5-042", as: "merukimon" },
        { card: "BT1-010", as: "revealedFirst" },
        { card: "BT1-011", as: "revealedSecond" },
        { card: "BT1-012", as: "unrevealed" },
      ],
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() => eventLog.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX5-042"));

    const returnedToBottom = indexOfEvent(
      eventLog,
      (event) => event.kind === "cardsMoved" && event.to === "deckBottom",
    );
    const merukimonReveal = indexOfEvent(
      eventLog,
      (event) => event.kind === "cardRevealed" && event.sourceCardId === "EX5-042",
    );
    expect(returnedToBottom).toBeGreaterThanOrEqual(0);
    expect(merukimonReveal).toBeGreaterThan(returnedToBottom);

    expect(s.perm("mame").topCard?.instanceId).toBe(s.inst("merukimon").instanceId);
    // Merukimon reveals the top of the deck, which is a card MameTyramon already put back at the bottom.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("revealedFirst").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("revealedSecond").instanceId]);
  });

  it("activates with 2 or fewer deck cards and reveals as many as possible (Q1590)", async () => {
    const { s, eventLog } = attackWithMameTyramon(
      [
        { card: "BT1-010", as: "revealedFirst" },
        { card: "BT7-054", as: "ancient" },
      ],
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await settle(() => eventLog.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-049"));

    const revealed = eventLog.filter((event) => event.kind === "cardRevealed" && event.sourceCardId === "BT7-049");
    expect(revealed.map((event) => (event.kind === "cardRevealed" ? event.cardId : undefined))).toEqual([
      "BT1-010",
      "BT7-054",
    ]);
    expect(s.perm("mame").topCard?.instanceId).toBe(s.inst("ancient").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("revealedFirst").instanceId]);
  });
});
