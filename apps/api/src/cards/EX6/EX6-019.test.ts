import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-019.js";

describe("EX6-019 Angemon", () => {
  it("has Barrier and inherits once-per-turn conditional draw", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });
});
