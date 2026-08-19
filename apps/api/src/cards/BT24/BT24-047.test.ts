import { describe, expect, it } from "vitest";
import { compiled as BT24_047 } from "./BT24-047.js";

describe("BT24-047 Kokatorimon", () => {
  it("keeps the unsuspend and follow-up attack on the same qualifying Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_047.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({ kind: "Unsuspend", condition: { kind: "ifThisEffectActed" } });
      expect(actions[2]).toMatchObject({
        kind: "Attack",
        condition: { kind: "ifThisEffectActed" },
        target: { sameTarget: true },
      });
    }
  });
});
