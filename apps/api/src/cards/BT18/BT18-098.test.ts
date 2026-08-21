import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-098.js";

describe("BT18-098 Dragon's Roar", () => {
  it("covers the effect-driven security trash trigger and color waiver", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDiscardSecurity",
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } } },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 }, condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "eq", value: 0 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Data", "Witchelny"], match: "trait" }] } } }],
    });
  });

  it("requires the top-security trash before the Main then-clause (Q3050)", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "ModifyDP", amount: -6000, duration: "untilOpponentTurnEnd", cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security" } } } },
        { kind: "SecurityManipulation", op: "addBottom", source: "this", condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 2 } },
      ],
    });
  });
});
