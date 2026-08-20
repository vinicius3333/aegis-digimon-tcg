import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-020.js";

describe("EX8-020", () => {
  it("inherits a once-per-turn draw when attacking with seven or fewer cards in hand", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1, condition: { kind: "zoneCount", value: 7 } }] }));
});
