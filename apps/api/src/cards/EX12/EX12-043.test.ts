import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-043.js";

function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm("source").topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX12-043/"));
  if (effect === undefined) throw new Error("EX12-043 did not surface its Main effect");
  return effect.effectKey;
}

describe("EX12-043 Hakubamon", () => {
  it("plays a matching SW Digimon with its cost reduced by two", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX12-043", as: "source" }], hand: [{ card: "EX12-039", as: "target" }] } },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-039"));

    expect(s.state.memory).toBe(0);
  });

  it("encodes the matching SW Option branch with the same reduction", () => {
    const modal = registeredCompiledCards.get("EX12-043")!.effects.find((effect) => effect.trigger === "Main")!
      .actions[0]! as {
      kind: string;
      options: { [key: string]: unknown }[][];
    };
    expect(modal.kind).toBe("Modal");
    expect(modal.options[1]![0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
      payCost: true,
      reduceCostBy: 2,
    });
  });

  it("keeps Once Per Turn and the inherited Barrier effect", () => {
    const compiled = registeredCompiledCards.get("EX12-043")!;
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.frequency).toBe("OncePerTurn");
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ isInherited: true, keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] }),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }]);
  });
});
