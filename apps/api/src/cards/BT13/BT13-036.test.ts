import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-036.js";

describe("BT13-036 Liollmon", () => {
  it("gains memory on security removal and preserves the inherited security-count debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "ModifyDP", amount: -2000, condition: expect.objectContaining({ kind: "totalSecurityCount", value: 6 }) })] });
  });
});
