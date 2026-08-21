import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "../index.js";

const compiled = getCompiledCard("EX10-060");

describe("EX10-060 Lucemon: Satan Mode", () => {
  it("has complete coverage and the alternate Lucemon: Chaos Mode evolution", () => {
    expect(compiled).toBeDefined();
    expect(compiled!.coverage).toBe("full");
    expect(compiled!.residual).toEqual([]);
    expect(compiled!.digivolutionRequirement).toEqual([{ names: ["Lucemon: Chaos Mode"], cost: 6, isAlternate: true }]);
  });

  it("plays Lucemon: Larva to an empty breeding area before the conditional deletion", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled!.effects!.find((entry) => entry.trigger === trigger);
      expect(effect!.actions).toHaveLength(1);
      expect(effect!.actions![0]).toMatchObject({
        kind: "Delete",
        cost: { kind: "raw", raw: expect.stringContaining("Lucemon: Larva") },
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("shares the once-per-turn budget between When Digivolving and When Attacking", () => {
    const reactions = compiled!.effects!.filter((entry) => entry.frequency === "OncePerTurn");
    expect(reactions).toHaveLength(2);
    expect(reactions.map((entry) => entry.trigger)).toEqual(["WhenDigivolving", "WhenAttacking"]);
    expect(new Set(reactions.map((entry) => entry.sharedUseKey))).toEqual(new Set(["ir-shared-0"]));
    expect(reactions.every((entry) => (entry.actions?.length ?? 0) > 0)).toBe(true);
  });
});
