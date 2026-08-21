import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-080.js";

describe("BT17-080 Takato Matsuki", () => {
  it("gains memory for a Guilmon, Growlmon, or Gallantmon Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["Guilmon", "Growlmon", "Gallantmon"], match: "name" }] } } }] });
  });

  it("optionally evolves a Guilmon into Gallantmon for free after placing all three Trash cards", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [{
        kind: "Digivolve",
        target: { filter: { nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] } },
        into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }] },
        from: ["hand"],
        payCost: false,
        ignoreRequirements: true,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom" },
        additionalCosts: [
          { kind: "place", target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Growlmon"], match: "name" }] } } },
          { kind: "place", target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "name" }] } } },
        ],
      }],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }] });
  });
});
