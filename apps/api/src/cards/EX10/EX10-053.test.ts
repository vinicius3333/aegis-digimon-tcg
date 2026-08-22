import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-053.js";

describe("EX10-053 Regulusmon", () => {
  it("proves distinct-name Gammamon stacking, DP-bounded deletion, end-turn attack, and deletion memory", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Gammamon"], cost: 5, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlaceUnder", target: { count: 5, upTo: true, distinctNames: true, from: ["trash"] } },
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } }, count: 1 }, optional: true },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Attack", withoutSuspending: true, optional: true, condition: { kind: "selfDigivolutionCountAtLeast", value: 5 } }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
