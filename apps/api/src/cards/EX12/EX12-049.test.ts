import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
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

  it("Q6824 finds Angoramon only in printed effect text on a non-NSp Option", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-049", as: "source" }],
          deck: ["BT10-102", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT10-102"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT10-102");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("adds one physical card only once when it satisfies both reveal slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-049", as: "source" }],
          deck: [{ card: "EX12-050", as: "both" }, "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.filter(({ instanceId }) => instanceId === s.inst("both").instanceId)).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("gives an inherited host +1000 DP on all turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX12-049"] },
          { card: "EX12-049", as: "top" },
          { card: "BT1-009", as: "bystander" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("top").currentDP).toBe(2000);
    expect(s.perm("bystander").currentDP).toBe(3000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("digivolves through both printed colors and both zero-cost alternate routes", async () => {
    for (const [baseCardId, useAlternateCost, expectedCost] of [
      ["BT1-007", false, 1],
      ["BT10-005", false, 1],
      ["BT10-004", true, 0],
      ["P-148", true, 0],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-049", as: "target" }] },
      });
      s.state.memory = 1;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-049");
      expect(s.state.memory).toBe(1 - expectedCost);
    }
  });

  it("rejects an off-color level-2 card matching neither alternate route", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "EX12-049", as: "target" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("maps the catalog, both zero-cost evolution routes, reveal filters, and full coverage", () => {
    const card = getCardDefinition("EX12-049");
    const compiled = registeredCompiledCards.get("EX12-049")!;
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay")!;
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;

    expect(card).toMatchObject({
      nameEn: "Angoramon",
      colors: ["Green", "Black"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast", "NSp"],
      evoCosts: [
        { color: "Green", level: 2, memoryCost: 1 },
        { color: "Black", level: 2, memoryCost: 1 },
      ],
    });
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
    expect(compiledEffects["EX12-049"]).toEqual(compiled);
  });
});
