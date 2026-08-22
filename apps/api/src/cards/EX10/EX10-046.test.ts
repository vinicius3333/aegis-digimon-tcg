import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-046.js";

describe("EX10-046 Devimon", () => {
  it("proves thresholded mill-then-return sequencing and inherited once-per-turn mill", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "both", amount: 2, condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 } },
          { kind: "Return", to: "hand", optional: true, condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 }, target: { filter: { controller: "mine", zone: "trash" }, count: 1 } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "TrashTopDeck", controller: "both", amount: 1 }] });
  });
});
