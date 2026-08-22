import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-074.js";

describe("BT20-074 Dinobeemon", () => {
  it("may return one Imperialdramon-named or Free Digimon from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }, { tokens: ["Free"], match: "trait" }] }, count: 1 } }] });
    }
  });

  it("offers DNA digivolution from hand when a qualifying Dinobeemon or Paildramon would return", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "wouldBeReturned", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Dinobeemon", "Paildramon"], match: "name" }], returnDestination: ["hand", "deck"] }, actions: [{ kind: "DnaDigivolve", optional: true, payCost: true, materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 }, into: { controller: "mine", kind: ["Digimon"], zone: "hand", nameOrTrait: [{ tokens: ["Imperialdramon: Dragon Mode"], match: "name" }] } }] }] });
  });

  it("inherits prevention of Option security effects for the turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "GrantStatic", grant: { kind: "PreventSecurityActivation", cardType: "Option" }, duration: "forTheTurn" }] });
  });
});
