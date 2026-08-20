import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-032.js";

describe("EX8-032", () => {
  it("inherits a once-per-turn -2000 DP effect against an opposing Digimon when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { count: 1 } }] }));
});
