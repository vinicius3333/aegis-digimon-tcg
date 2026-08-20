import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-037.js";

describe("BT13-037 Liamon", () => {
  it("trashes the top security card for the attack debuff", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -4000, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } } });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });
});
