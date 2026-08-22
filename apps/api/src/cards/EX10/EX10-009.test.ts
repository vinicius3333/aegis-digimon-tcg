import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-009.js";

describe("EX10-009 Creepymon", () => {
  it("models both deletion fallback branches and the conditional breeding-area play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: "all" } },
        { kind: "TrashTopDeck", controller: "opponent", amount: 5, condition: { kind: "ifThisEffectDidNotDelete" } },
      ] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({ actions: [{
      kind: "PlayWithoutCost",
      from: ["trash"],
      breeding: true,
      optional: true,
      condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Red", "Purple"], dp: { op: "lte", value: 5000 } }, count: 1 },
    }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({ actions: [{ kind: "Attack", withoutSuspending: true, optional: true }] });
  });
});
