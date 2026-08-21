import { describe, expect, it } from "vitest";
import { compiled } from "./EX12-050.js";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm("source").topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX12-050/"));
  if (effect === undefined) throw new Error("EX12-050 did not surface its Main effect");
  return effect.effectKey;
}

describe("EX12-050 SymbareAngoramon", () => {
  it("offers the once-per-turn reduced-cost play/use choice", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toMatchObject([
      {
        kind: "Modal",
        choose: 1,
        options: [
          [{ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 2, optional: true }],
          [{ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 2, optional: true }],
        ],
      },
    ]);
  });

  it("retains the Angoramon/NSp evolution routes and inherited DP", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Angoramon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSp"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions).toMatchObject([
      { kind: "ModifyDP", amount: 1000, duration: "permanent" },
    ]);
  });

  it("plays one matching Digimon with the reduced paid cost and shares the Once Per Turn gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-050", as: "source" }],
          hand: ["EX12-051", "EX12-051"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-051"));

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX12-051")).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX12-051")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "EX12-051")).toHaveLength(
      1,
    );
  });

  it("uses a matching NSp Option through the same reduced-cost choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-050", as: "source" }],
          hand: [{ card: "EX12-073", as: "option" }],
          deck: ["EX12-051", "BT1-009", "BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-073"));

    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-051")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-073")).toBe(true);
  });
});
