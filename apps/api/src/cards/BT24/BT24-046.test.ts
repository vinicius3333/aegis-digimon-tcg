import { describe, expect, it } from "vitest";
import { compiled as BT24_046 } from "./BT24-046.js";

describe("BT24-046 Garurumon", () => {
  it("suspends one opposing Digimon on both entry timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_046.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
  it("has inherited once-per-turn suspension while attacking", () => {
    expect(BT24_046.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });
});
