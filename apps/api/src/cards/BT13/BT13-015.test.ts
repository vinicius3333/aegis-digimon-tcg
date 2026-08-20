import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-015.js";

describe("BT13-015 RizeGreymon", () => {
  it("plays Marcus Damon and preserves both deletion security effects", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.filter(effect => effect.trigger === "AllTurns")).toHaveLength(2);
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true, payCost: false })] }),
      expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "onDeletionOf", actions: [expect.objectContaining({ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true })] })] }),
    ]));
  });
});
