import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm("source").topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX12-013/"));
  if (effect === undefined) throw new Error("EX12-013 did not surface its Main effect");
  if (effect.maxPerTurn !== 1) throw new Error(`EX12-013 Main maxPerTurn was ${effect.maxPerTurn}`);
  return effect.effectKey;
}

describe("EX12-013 BetelGammamon", () => {
  it("plays one matching VB Digimon with its cost reduced by two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: [{ card: "EX12-007", as: "target" }],
        },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-007"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX12-013",
      "EX12-007",
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(false);
  });

  it("uses one matching Option with the same reduction and trashes it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: [{ card: "BT10-094", as: "option" }],
        },
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.perm("source").currentDP).toBe(8000);
    expect(s.state.memory).toBe(0);
  });

  it("plays a non-VB card whose effect text contains Gammamon (Q6730)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: [{ card: "AD1-007", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-007"));

    expect(s.state.memory).toBe(0);
  });

  it("does not combine reductions from two copies for one play (Q6731)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-013", as: "source" },
            { card: "EX12-013", as: "second" },
          ],
          hand: [{ card: "EX12-007", as: "target" }],
        },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-007"));

    expect(s.state.memory).toBe(0);
  });

  it("plays for full printed cost when Solarmon forbids reduction (Q6732)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: [{ card: "EX12-007", as: "target" }],
        },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-007"));

    expect(s.state.memory).toBe(0);
  });

  it("activates but cannot play through Pomumon's effect-play lock (Q6733)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: [{ card: "EX12-007", as: "target" }],
        },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
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

  it("enforces Once Per Turn across two activations", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: ["EX12-007", "EX12-007"],
        },
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
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX12-007")).toHaveLength(
      1,
    );
  });

  it("does not offer an unrelated card and preserves the source's board state", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-013", as: "source" }],
          hand: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("encodes playable card kinds, option use, reduction, timing, and evolution routes", () => {
    const compiled = registeredCompiledCards.get("EX12-013")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Gammamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["VB"], cost: 2, isAlternate: true },
    ]);
    const effect = compiled.effects.find((entry) => entry.trigger === "Main")!;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions).toMatchObject([
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
              target: { filter: { kind: ["Digimon", "Tamer"] } },
            },
          ],
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
      keywords: [{ keyword: "Barrier" }],
    });
  });

  it("grants inherited Barrier only to its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-007", as: "host", under: ["EX12-013"] },
          { card: "EX12-007", as: "control" },
        ],
      },
    });
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Barrier")).toBe(true);
    expect(continuous.hasKeyword(s.perm("control").permanentId, "Barrier")).toBe(false);
  });

  it("uses both normal colors and both printed cost-2 alternatives", async () => {
    expect(digivolutionRequirementsFor("EX12-013")).toEqual([
      { names: ["Gammamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["VB"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["EX12-005", false, 3],
      ["EX12-040", false, 3],
      ["RB1-005", true, 2],
      ["EX12-021", true, 2],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-013", as: "betel" }],
        },
      });
      s.state.memory = startingMemory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("betel").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-013");
      expect(s.state.memory).toBe(0);
    }
  });
});
