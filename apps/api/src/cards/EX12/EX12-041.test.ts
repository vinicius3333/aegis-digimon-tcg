import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-041";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias = "source"): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm(alias).topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX12-041/"));
  if (effect === undefined) throw new Error("EX12-041 did not surface its Main effect");
  return effect.effectKey;
}

describe("EX12-041 Thundermon", () => {
  it("matches the catalog, modal, Rule name, evolution route, and inherited effect", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Thundermon",
      colors: ["Yellow", "Black"],
      playCost: 5,
      dp: 6000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mutant", "ME"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["ME"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
                target: {
                  filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Mutant", "ME"], match: "trait" }] },
                },
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                allowMultiColor: true,
                optional: true,
                filter: {
                  kind: ["Option"],
                  playCostLte: 99,
                  nameOrTrait: [{ tokens: ["Mutant", "ME"], match: "trait" }],
                },
              },
            ],
          ],
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Mamemon"] }],
    });
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("plays a matching Digimon with its cost reduced by two", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-041", as: "source" }], hand: [{ card: "EX12-038", as: "target" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-038"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
  });

  it("uses a matching Option with the same reduction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-041", as: "source" }], hand: [{ card: "EX12-072", as: "option" }] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("uses a multicolor Mutant Option, which the default single-color gate would have hidden", async () => {
    const s = setupEngine(
      {
        0: {
          // ST23-06 supplies the green color requirement and the [BEATBREAK] use requirement
          // that ST23-09 prints; ST23-09 itself is a Green/Black [Mutant] Option costing 5.
          battleArea: [
            { card: "EX12-041", as: "source" },
            { card: "ST23-06", as: "enabler" },
          ],
          hand: [{ card: "ST23-09", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.every(({ instanceId }) => instanceId !== s.inst("option").instanceId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("option").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("enforces Once Per Turn and grants the Rule name Mamemon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-041", as: "source" }], hand: ["EX12-038", "EX12-038"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const effectKey = mainEffectKey(s);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => false, 300);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(registeredCompiledCards.get("EX12-041")!.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Mamemon"] }],
    });
  });

  it("keeps the inherited attack DP reduction once per turn", () => {
    expect(registeredCompiledCards.get("EX12-041")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("does not combine reductions from two copies into one play (Q6801)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "first" },
            { card: cardId, as: "second" },
          ],
          hand: [
            { card: cardId, as: "firstTarget" },
            { card: cardId, as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    for (const [sourceAlias, targetAlias, expectedMemory] of [
      ["first", "firstTarget", 3],
      ["second", "secondTarget", 0],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.perm(sourceAlias).topCard.instanceId,
          effectKey: mainEffectKey(s, sourceAlias),
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst(targetAlias).instanceId),
      );
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("plays for full printed cost when Solarmon forbids reductions (Q6802)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-038", as: "target" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("activates but cannot play through Pomumon's effect-play lock (Q6803)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-038", as: "target" }] },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("applies the inherited DP reduction only once across repeated attack timings", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-051", as: "host", under: [cardId] }] },
        1: { battleArea: [{ card: "BT1-011", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("uses yellow, black, and off-color ME evolution routes and rejects a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["EX12-038", false, 3],
      ["EX12-053", false, 3],
      ["EX12-008", true, 2],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = memory;
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
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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
