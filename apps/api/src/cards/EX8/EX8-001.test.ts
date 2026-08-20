import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-001.js";

describe("EX8-001", () => {
  it("inherits a once-per-turn attack deletion against an opposing Digimon with 3000 DP or less when it has Tyrannomon or Dinosaur", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 3000 } } }, condition: { kind: "anyOf" } }] }));
});
