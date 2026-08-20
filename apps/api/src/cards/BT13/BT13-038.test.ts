import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-038.js";

describe("BT13-038 Reppamon", () => {
  it("trashes the top security card for Security Attack -2", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -2 }, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } } });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" });
  });
});
