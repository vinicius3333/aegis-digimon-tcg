import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-011.js";

describe("BT23-011 Birdramon", () => {
  it("deletes one opposing Digimon at 4000 DP or less on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
      });
    }
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
