import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-049 Angoramon", () => {
  it("reveals three cards and adds one Angoramon-text card plus one NSp card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-049", as: "source" }],
          deck: ["BT10-102", "EX12-050", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT10-102", "EX12-050"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("returns all unrecruited reveal cards to the bottom when only the NSp branch matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-049", as: "source" }],
          deck: ["BT1-009", "EX7-015", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-015");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("gives an inherited host +1000 DP on all turns", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX12-049"] }] } });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(4000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("maps the catalog, both zero-cost evolution routes, reveal filters, and full coverage", () => {
    const card = getCardDefinition("EX12-049");
    const compiled = registeredCompiledCards.get("EX12-049")!;
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay")!;
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;

    expect(card?.effectText).toContain("Reveal the top 3 cards");
    expect(digivolutionRequirementsFor("EX12-049")).toEqual([
      { names: ["Bosamon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["NSp"], cost: 0, isAlternate: true },
    ]);
    expect(onPlay).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "text", tokens: ["Angoramon"] }] } },
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["NSp"] }] } },
          ],
        },
      ],
    });
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
