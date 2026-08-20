import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-002.js";

describe("EX8-002", () => {
  it("inherits a once-per-turn attack effect that gains 1 memory at 0 memory", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "youHave" } }] }));
});
