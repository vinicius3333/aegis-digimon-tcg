import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-038";

describe("EX12-038 Kokuwamon", () => {
  it("matches the catalog, optional paid draw, evolution route, and inherited effect", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Kokuwamon",
      colors: ["Yellow"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Machine", "ME"],
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 0 },
        { color: "Black", level: 2, memoryCost: 0 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["ME"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Mutant", "ME"], match: "trait" }] },
            },
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("may decline the On Play cost without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "BT10-075", as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("trashes the required hand card and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-038", as: "source" }],
          hand: [{ card: "EX12-037", as: "cost" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("applies the inherited DP reduction once per turn when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "source", under: ["EX12-038"] }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 3000, 100);

    expect(s.perm("opponent").currentDP).toBe(3000);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("opponent").currentDP).toBe(3000);
  });

  it("accepts both Mutant and ME costs but rejects a nonmatching hand", async () => {
    for (const costCardId of ["BT10-075", "EX12-037"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: cardId, as: "source" }],
            hand: [{ card: costCardId, as: "cost" }],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
      expect(s.state.players[0]!.hand).toHaveLength(2);
    }

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "BT1-009", as: "wrong" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(invalid.engine).fire(EffectTiming.OnPlay, invalid.perm("source"));
    expect(invalid.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      invalid.inst("wrong").instanceId,
    );
    expect(invalid.state.players[0]!.deck).toHaveLength(2);
  });

  it("uses yellow, black, and ME level-2 evolution routes for zero", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT1-005", false],
      ["BT10-005", false],
      ["EX12-003", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
