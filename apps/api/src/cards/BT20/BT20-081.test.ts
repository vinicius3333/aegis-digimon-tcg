import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-081.js";

describe("BT20-081 Fenriloogamon: Takemikazuchi", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDNADigivolve" }] });
  });

  it("gives two distinct opposing Digimon -10000 DP and conditionally deletes one at 10000 DP or lower", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -10000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 } });
      expect(actions[1]).toMatchObject({ kind: "Delete", condition: { kind: "selfDigivolutionStackCountAtLeast", count: 1, filter: { kind: ["Tamer"] } }, target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 10000 } }, count: 1 } });
    }
  });

  it("trashes the top security card to optionally reactivate one When Digivolving effect when attacking", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({ actions: [{ kind: "ReactivateEffect", fromTrigger: "WhenDigivolving", count: 1, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { controller: "mine", zone: "security" }, count: 1, fromTop: true } } }] });
  });
});
