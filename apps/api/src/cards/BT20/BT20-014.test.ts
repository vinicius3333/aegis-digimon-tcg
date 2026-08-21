import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-014.js";

describe("BT20-014 SaviorHuckmon", () => {
  it("deletes up to 5000 DP, pays no cost for the optional Jesmon evolution, and gates Alliance on Royal Knight", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 } }],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true, abortOnDecline: true, cost: { kind: "suspend" }, into: { nameOrTrait: [{ tokens: ["Jesmon"], match: "name" }] } }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Alliance" }, condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] } } }],
    });
  });
});
