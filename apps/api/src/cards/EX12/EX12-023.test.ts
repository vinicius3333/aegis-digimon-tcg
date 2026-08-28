import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-023 Jellymon", () => {
  it("reveals three, adds Jellymon-text and DS cards, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-023", as: "source" }],
          deck: ["EX12-023", "EX12-027", "BT1-009"],
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
        s.state.players[0]!.hand.some((card) => card.cardId === "EX12-023") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX12-027"),
    );

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-023", "EX12-027"]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("applies Q6752 by adding a non-DS card that mentions Jellymon only in its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-023", as: "source" }],
          deck: ["BT13-028", "EX12-027", "BT1-009"],
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
      expect.arrayContaining(["BT13-028", "EX12-027"]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("adds a Jellymon-text DS card only once when no second card fills the other slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-023", as: "source" }],
          deck: ["EX12-023", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX12-023"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("draws then trashes one card when the post-draw hand reaches seven", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-023"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 6 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("draws but does not trash when the post-draw hand remains below seven", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-023"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 6);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("encodes both zero-cost evolution routes, both reveal slots, and the post-draw hand threshold", () => {
    const card = getCardDefinition("EX12-023");
    const compiled = registeredCompiledCards.get("EX12-023")!;
    expect(card).toMatchObject({
      nameEn: "Jellymon",
      colors: ["Blue", "Yellow"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mollusk", "DS"],
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
    });
    expect(card?.effectText).toContain("[Jellymon] in its text");
    expect(card?.inheritedEffectText).toContain("Then, if your hand has 7 or more cards");
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Puyoyomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["DS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Jellymon"], match: "text" }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["DS"], match: "trait" }] },
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
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        {
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
          condition: { kind: "handAtLeast", value: 7 },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses both normal colors and the Puyoyomon-name and DS-trait evolution routes", async () => {
    expect(digivolutionRequirementsFor("EX12-023")).toEqual([
      { names: ["Puyoyomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["DS"], cost: 0, isAlternate: true },
    ]);

    for (const [eggCardId, useAlternateCost, startingMemory, expectedMemory] of [
      ["BT1-003", false, 1, 0],
      ["BT1-005", false, 1, 0],
      ["BT9-002", true, 0, 0],
      ["EX8-002", true, 0, 0],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: eggCardId, as: "egg" },
          hand: [{ card: "EX12-023", as: "jellymon" }],
        },
      });
      s.state.memory = startingMemory;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("jellymon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-023");
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("rejects an off-color level-2 Digi-Egg that is neither Puyoyomon nor DS", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [{ card: "EX12-023", as: "jellymon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("jellymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
