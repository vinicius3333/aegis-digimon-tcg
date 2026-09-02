import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-021 Gabumon", () => {
  it("pays with a VB-trait hand card, draws one, and gains one memory at start of main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-021", as: "source" }],
          hand: [{ card: "EX12-007", as: "cost" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("pays with a Garurumon-name hand card that does not have the VB trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-021", as: "source" }],
          hand: [
            { card: "BT1-036", as: "cost" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-036"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("unrelated").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.memory).toBe(1);
  });

  it("still gains the memory after paying the cost when the deck is empty and nothing is drawn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-021", as: "source" }],
          hand: [{ card: "EX12-007", as: "cost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("cannot pay the trash cost with a matching card that is not in the hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-021", as: "source" }],
          trash: [{ card: "EX12-007", as: "inTrash" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX12-007"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("may decline the hand-trash cost and then neither draws nor gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-021", as: "source" }],
          hand: [{ card: "EX12-007", as: "cost" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("does not resolve the combined effect without a matching hand cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-021", as: "source" }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("draws once from the inherited attack effect when the hand has seven or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-021"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("does not draw from the inherited effect when the hand starts above seven cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-021"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("encodes both zero-cost evolution routes, the exact hand cost filter, and inherited Once Per Turn draw", () => {
    const card = getCardDefinition("EX12-021");
    const compiled = registeredCompiledCards.get("EX12-021")!;
    expect(card).toMatchObject({
      nameEn: "Gabumon",
      colors: ["Blue"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Reptile", "VB"],
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
    });
    expect(card?.effectText).toContain("[Start of Your Main Phase]");
    expect(card?.inheritedEffectText).toContain("7 or fewer cards");
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [
                  { tokens: ["Garurumon"], match: "name" },
                  { tokens: ["VB"], match: "trait" },
                ],
              },
            },
          },
        },
        { kind: "GainMemory", amount: 1 },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[1]).not.toHaveProperty(
      "condition",
    );
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "handAtMost", value: 7 } }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses the normal blue, Tsunomon-name, and VB-trait level-2 evolution routes for zero", async () => {
    expect(digivolutionRequirementsFor("EX12-021")).toEqual([
      { names: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);

    for (const [eggCardId, useAlternateCost] of [
      ["BT1-003", false],
      ["BT11-006", true],
      ["EX12-001", true],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: eggCardId, as: "egg" },
          hand: [{ card: "EX12-021", as: "gabumon" }],
        },
      });

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst("gabumon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-021");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-2 Digi-Egg that is neither Tsunomon nor VB", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [{ card: "EX12-021", as: "gabumon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gabumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
