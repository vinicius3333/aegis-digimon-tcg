import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-049.js";

describe("EX10-049 SkullSatamon", () => {
  it("proves thresholded delete sequencing and the inherited instead branch", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({ keywords: [{ keyword: "Blocker" }] });
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "both", amount: 3, condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 } },
          { kind: "CostModifier", mode: "raiseCeiling", costType: "level", amount: 2, condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 } },
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 3 } }, count: 1 } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, condition: { kind: "zoneCount", op: "gt", value: 10 } },
        { kind: "TrashTopDeck", controller: "both", amount: 2, condition: { kind: "zoneCount", op: "lte", value: 10 } },
      ],
    });
  });
});
