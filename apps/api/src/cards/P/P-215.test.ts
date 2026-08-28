import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-215.js";

describe("P-215 Icemon", () => {
  it("shares the exact paid placement and two opponent-scoped protections across all triggers", () => {
    const compiled = runtimeCompiledCard("P-215")!;
    for (const trigger of ["WhenMoving", "OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)!.actions[0];
      expect(action).toMatchObject({
        kind: "CostGatedBlock",
        optional: true,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: {
            filter: {
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Ice-Snow", "Mineral", "Rock"], match: "trait" }],
            },
          },
        },
        actions: [
          { kind: "SelectBind", bindAs: "protectedDigimon" },
          {
            kind: "Restrict",
            restriction: "beReturned",
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "Restrict",
            restriction: "cantBeDeDigivolved",
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
  });

  it("registers inherited Blocker and the exact alternate evolution path", () => {
    const compiled = runtimeCompiledCard("P-215")!;
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Ice-Snow", "Mineral", "Rock"], cost: 2, isAlternate: true },
    ]);
  });
});
