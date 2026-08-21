import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-031.js";

describe("BT20-031 Liamon", () => {
  it("reduces one opposing Digimon by 3000 DP for the turn on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -3000, duration: "forTheTurn" }] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["ACCEL"], cost: 2, isAlternate: true }]);
  });
});
