import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-039.js";

describe("BT20-039 Diatrymon", () => {
  it("suspends one opposing Digimon on both entry triggers and inherits Piercing", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Piercing", raw: "＜Piercing＞" }]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["ACCEL"], cost: 2, isAlternate: true }]);
  });
});
