import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-080.js";

describe("BT26-080 compiled behavior", () => {
  it("proves dual-card keywords, TS waiver, Bacchusmon evolution, and both Main steps", () => {
    expect(compiled.coverage).toBe("partial");
    expect(compiled.residual).toHaveLength(1);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Bacchusmon"], basePlayCost: 12, cost: 2, isAlternate: true }]);
    expect(compiled.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "SecurityAttack", amount: 1 }),
      expect.objectContaining({ keyword: "Succession" }),
    ]));
    expect(compiled.effects[0].actions[0]).toMatchObject({ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } } });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "Attack", withoutSuspending: true, cost: { kind: "suspend", target: { filter: { kind: ["Digimon"] }, count: 1 } } }] });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({ actions: [
      { kind: "Unsuspend", optional: true, target: { filter: { kind: ["Digimon"] }, count: 1 } },
      { kind: "Delete", target: { count: "all", filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true, superlative: "lowestDP" } } },
    ] });
  });

  it("keeps the Q7112 same-orientation limitation explicit", () => {
    expect(compiled.residual[0]).toContain("same-orientation-as-self");
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "RawUnparsed" });
  });
});
