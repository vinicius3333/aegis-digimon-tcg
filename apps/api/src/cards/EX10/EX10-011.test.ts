import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-011.js";

describe("EX10-011 MaloMyotismon", () => {
  it("proves the trash play cost, mandatory two-target deletion, and deletion payoff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Myotismon"], cost: 5, isAlternate: true }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({ isFromTrash: true, actions: [{
      kind: "Replacement", mode: "reduceCost", amount: 11, optional: false,
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 }, nameOrTrait: [{ match: "text", tokens: ["Myotismon"] }] }, count: 2 } },
    }] });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{
        kind: "Delete", target: { filter: { controllerDefault: "any", excludeSelf: true, unsuspended: true, kind: ["Digimon"] }, count: 2 },
      }] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{
      kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon", "Tamer"] },
      actions: [{ kind: "trashSecurityTop", controller: "opponent", count: 1 }, { kind: "Return", to: "deckBottom", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 } }],
    }] });
  });
});
