import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-038.js";

describe("BT20-038 Falcomon", () => {
  it("reduces qualifying ACCEL digivolution only from the battle area", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { isSelfRef: true, zone: "battleArea" }, into: { nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] }, actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Piercing", raw: "＜Piercing＞" }]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Pinamon"], cost: 0, isAlternate: true }, { level: 2, traits: ["ACCEL"], cost: 0, isAlternate: true }]);
  });
});
