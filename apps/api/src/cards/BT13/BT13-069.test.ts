import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-069.js";

describe("BT13-069 KingSukamon", () => {
  it("plays a level-4 Sukamon on attack and prevents deletion by deleting another Sukamon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ level: 4, names: ["Sukamon"], cost: 3 }));
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [expect.objectContaining({ kind: "PlayWithoutCost", optional: true })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Replacement", event: "wouldBeDeleted" })] });
  });
});
