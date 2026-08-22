import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
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

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["EX12-013", "EX12-007"]);
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
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX12-007")).toHaveLength(1);
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
          [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true, target: { filter: { kind: ["Digimon", "Tamer"] } } }],
          [{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true, filter: { kind: ["Option"] } }],
        ],
      },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier" }],
    });
  });
});
