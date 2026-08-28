import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX12-027.js";
import "../index.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm("source").topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX12-027/"));
  if (effect === undefined) throw new Error("EX12-027 Main effect was not registered");
  return effect.effectKey;
}

describe("EX12-027 TeslaJellymon", () => {
  it("offers exactly one play-or-use branch", () => {
    const effect = registeredCompiledCards.get("EX12-027")!.effects[0]!;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions).toHaveLength(1);
    expect(effect.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [[{ kind: "PlayWithoutCost" }], [{ kind: "UseOptionWithoutCost" }]],
    });
  });

  it("plays a matching Jellymon-text Digimon with the printed cost reduced by two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "source" }],
          hand: [{ card: "EX12-023", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-023"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-023")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
  });

  it("applies Q6754 by playing a non-DS card that mentions Jellymon only in its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "source" }],
          hand: [{ card: "BT13-028", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-028"));

    expect(s.state.memory).toBe(0);
  });

  it("does not combine reductions from two copies for one play (Q6755)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-027", as: "source" },
            { card: "EX12-027", as: "second" },
          ],
          hand: [{ card: "EX12-023", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-023"));

    expect(s.state.memory).toBe(0);
  });

  it("plays for full printed cost when Solarmon forbids reduction (Q6756)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "source" }],
          hand: [{ card: "EX12-023", as: "target" }],
        },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-023"));

    expect(s.state.memory).toBe(0);
  });

  it("activates but cannot play through Pomumon's effect-play lock (Q6757)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "source" }],
          hand: [{ card: "EX12-023", as: "target" }],
        },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
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
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("enforces the Main effect's Once Per Turn limit across two activations", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "source" }],
          hand: ["EX12-023", "EX12-023"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 0 },
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
    await settle(() => s.events.some((event) => event.kind === "effectActivated"));
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX12-023")).toHaveLength(
      1,
    );
  });

  it("uses a matching DS Option with the same reduction and resolves its Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "source" }],
          hand: [{ card: "EX12-073", as: "option" }],
          deck: ["EX12-023", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-073"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-073")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-023")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("inherits once-per-turn Draw 1 only before the hand reaches seven cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-027"] }],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 6 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("draws but does not trash when the inherited effect's post-draw hand stays below seven", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-027"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 6);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("encodes both evolution routes, both matching card kinds, cost reduction, timing, and inherited threshold", () => {
    const card = getCardDefinition("EX12-027");
    const compiled = registeredCompiledCards.get("EX12-027")!;
    expect(card).toMatchObject({
      nameEn: "TeslaJellymon",
      colors: ["Blue", "Yellow"],
      playCost: 5,
      dp: 6000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mollusk", "DS"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
    });
    expect(card?.effectText).toContain("play or use 1 card");
    expect(card?.inheritedEffectText).toContain("Then, if your hand has 7 or more cards");
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Jellymon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["DS"], cost: 2, isAlternate: true },
    ]);
    const effect = compiled.effects.find((entry) => entry.trigger === "Main")!;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions).toMatchObject([
      {
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }],
          [
            {
              kind: "UseOptionWithoutCost",
              from: ["hand"],
              payCost: true,
              reduceCostBy: 2,
              optional: true,
              filter: { kind: ["Option"] },
            },
          ],
        ],
      },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", condition: { kind: "handAtLeast", value: 7 } },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses both normal colors and the Jellymon-name and DS-trait evolution routes", async () => {
    expect(digivolutionRequirementsFor("EX12-027")).toEqual([
      { names: ["Jellymon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["DS"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["BT1-027", false, 3],
      ["BT1-045", false, 3],
      ["EX12-023", true, 2],
      ["EX8-056", true, 2],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-027", as: "tesla" }],
        },
      });
      s.state.memory = startingMemory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("tesla").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX12-027");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-3 Digimon that is neither Jellymon nor DS", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "base" }],
        hand: [{ card: "EX12-027", as: "tesla" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tesla").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
