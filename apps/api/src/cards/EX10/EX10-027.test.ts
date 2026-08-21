import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-027.js";

describe("EX10-027 DeadlyAxemon", () => {
  it("proves the Knightmon-text evolution, hand-trash payment, and optional return", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, texts: ["Knightmon"], cost: 2, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{
        kind: "Return", to: "hand", optional: true, abortOnDecline: true,
        target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "text", tokens: ["Knightmon"] }, { match: "trait", tokens: ["Bagra Army", "Twilight"] }] }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
      }] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({ keywords: [{ keyword: "Save" }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ keywords: [{ keyword: "Retaliation" }] });
  });
});
