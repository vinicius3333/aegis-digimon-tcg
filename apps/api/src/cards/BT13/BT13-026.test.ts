import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-026.js";

describe("BT13-026 TeslaJellymon", () => {
  it("draws on attack and trashes the opponent's bottom evolution card when inherited", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [expect.objectContaining({ kind: "TrashDigivolution", amount: 1, fromTop: false })] });
  });
});
