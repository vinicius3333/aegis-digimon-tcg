import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-016.js";

describe("BT13-016 SaviorHuckmon", () => {
  it("implements both Sistermon clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });
});
