import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-022 Kamemon", () => {
  it("reveals three, adds one Shambala and one SW card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-022", as: "source" }],
          deck: ["EX12-011", "EX12-012", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "EX12-011") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX12-012"),
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-011", "EX12-012"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("leaves the deck unchanged when no revealed card matches either trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-022", as: "source" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });

  it("adds a dual-trait revealed card only once when no second card fills the other slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-022", as: "source" }],
          deck: ["EX12-012", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX12-012"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("draws once from the inherited attack effect when the hand has seven or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-022"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("does not draw from the inherited effect when the hand starts above seven cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-022"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("encodes the Shambala evolution, both independent reveal slots, and inherited Once Per Turn draw", () => {
    const card = getCardDefinition("EX12-022");
    const compiled = registeredCompiledCards.get("EX12-022")!;
    expect(card).toMatchObject({
      nameEn: "Kamemon",
      colors: ["Blue"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Cyborg", "Shambala", "SW"],
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
    });
    expect(card?.effectText).toContain("Reveal the top 3 cards");
    expect(card?.inheritedEffectText).toContain("7 or fewer cards");
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Shambala"], cost: 0, isAlternate: true }]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "handAtMost", value: 7 } }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses the normal blue and alternate Shambala level-2 evolution routes for zero", async () => {
    expect(digivolutionRequirementsFor("EX12-022")).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);

    for (const [eggCardId, useAlternateCost] of [
      ["BT1-003", false],
      ["EX12-002", true],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: eggCardId, as: "egg" },
          hand: [{ card: "EX12-022", as: "kamemon" }],
        },
      });

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("kamemon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-022");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-2 Digi-Egg without Shambala", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [{ card: "EX12-022", as: "kamemon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("kamemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
