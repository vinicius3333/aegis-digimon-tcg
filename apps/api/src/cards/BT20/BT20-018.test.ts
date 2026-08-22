import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-018.js";

describe("BT20-018 Ouryumon", () => {
  it("de-digivolves and attack-gates breeding-area Chronicle evolution on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 2 },
          { kind: "SubTrigger", event: "whenAttacking", actions: [{ kind: "Digivolve", target: { targetBreeding: true }, from: ["hand", "trash"], payCost: false, optional: true, into: { levelComparison: { op: "lte", value: 6 }, nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] } }] },
        ],
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Delete", target: { filter: { superlative: "lowestDP" } } }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Trash", target: { fromTop: true }, condition: { kind: "selfHasName", names: ["Alphamon: Ouryuken"] } }] });
  });
});
