import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-014.js";

describe("BT13-014 Garudamon", () => {
  it("plays an optional red Tamer from hand at both printed timings", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger, actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"], optional: true, payCost: false })] }));
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "OnDeletion", isInherited: true, actions: [expect.objectContaining({ kind: "Delete" })] }));
  });
});
