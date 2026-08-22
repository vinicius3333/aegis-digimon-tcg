import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-164.js";

describe("P-164 Shellmon", () => {
  it("encodes On Play and When Digivolving draw with the hand placement cost", () => {
    const compiled = runtimeCompiledCard("P-164")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{
          kind: "Draw",
          controller: "mine",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 }, nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }] }, count: 1, from: ["hand"] },
            host: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          },
        }],
      });
    }
  });

  it("encodes Aquatic Rule trait and inherited once-per-turn End of Attack draw", () => {
    const compiled = runtimeCompiledCard("P-164")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Rule", actions: [expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] })] }),
      expect.objectContaining({ trigger: "EndOfAttack", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }),
    ]));
  });
});
