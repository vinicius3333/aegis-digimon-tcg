import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-041.js";

describe("BT20-041 Crowmon", () => {
  it("suspends an opponent, buffs one of yours, and optionally attacks on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
        { kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"] } }, amount: 3000, duration: "forTheTurn" },
        { kind: "Attack", optional: true },
      ] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }] });
  });
});
