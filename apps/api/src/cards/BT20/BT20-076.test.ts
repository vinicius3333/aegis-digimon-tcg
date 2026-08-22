import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-076.js";

describe("BT20-076 Imperialdramon: Dragon Mode", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDNADigivolve" }] });
  });

  it("deletes one opposing Digimon at 11000 DP or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 } });
    }
  });

  it("only on DNA digivolving may digivolve this Digimon into Fighter Mode from hand or trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[1]).toMatchObject({ kind: "Digivolve", from: ["hand", "trash"], payCost: false, optional: true, condition: { kind: "isDnaDigivolving" }, target: { filter: { isSelfRef: true }, isSelf: true }, into: { nameOrTrait: [{ tokens: ["Imperialdramon: Fighter Mode"], match: "name" }] } });
    }
  });
});
