import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-162.js";

describe("P-162 Coelamon", () => {
  it("protects one DS Digimon from DP reduction and opponent De-Digivolve effects", () => {
    const compiled = runtimeCompiledCard("P-162")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "GrantStatic",
        target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DS"], match: "trait" }] }, count: 1 },
        grant: { kind: "Protection", protections: ["dpReduction", "deDigivolve"], from: "opponent" },
        duration: "untilOpponentTurnEnd",
      });
    }
  });

  it("encodes inherited Blocker and DS level-3 digivolution", () => {
    const compiled = runtimeCompiledCard("P-162")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    ]));
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["DS"], cost: 2, isAlternate: true }]);
  });
});
