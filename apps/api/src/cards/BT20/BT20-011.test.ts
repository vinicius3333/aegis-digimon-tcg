import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-011.js";

describe("BT20-011 ExVeemon", () => {
  it("deletes up to 3000 DP and optionally pays for qualifying DNA digivolution on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { count: 2, filter: { controller: "mine", kind: ["Digimon"] } },
        into: { nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }, { tokens: ["Free"], match: "trait" }] },
        payCost: true,
        optional: true,
        condition: { kind: "isYourTurn" },
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });
});
