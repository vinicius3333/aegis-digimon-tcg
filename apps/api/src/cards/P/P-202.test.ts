import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-202.js";

describe("P-202 Tyrannomon", () => {
  it("requires a level 3 DM Digimon and has Training", () => {
    const card = runtimeCompiledCard("P-202")!;
    expect(card.digivolutionRequirement).toEqual([{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }]);
    expect(card.effects.find((effect) => !effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Training", raw: "＜Training＞" }],
    });
  });

  it("reduces one suspended own digivolution by 1 for Tyrannomon, Dinosaur, or Ver.1 targets", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", suspended: true, kind: ["Digimon"] },
          into: {
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur", "Ver.1"], match: "trait" },
            ],
          },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("preserves inherited Piercing", () => {
    expect(runtimeCompiledCard("P-202")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    });
  });

  it("exposes Training on the live Tyrannomon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-202", as: "tyranno" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tyranno"), "Training")).toBe(true);
  });

  it("reduces a real suspended Tyrannomon digivolution by one memory", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-016", as: "evolver" }],
        battleArea: [
          { card: "P-202", as: "tyranno" },
          { card: "BT1-009", suspended: true, as: "base" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tyranno"));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(9);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolver").instanceId);
  });
});
