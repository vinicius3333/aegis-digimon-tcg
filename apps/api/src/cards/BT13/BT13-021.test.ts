import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-021.js";

describe("BT13-021 Gaomon", () => {
  it("draws for both players and scales inherited DP on the opponent hand", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "Draw", controller: "opponent", amount: 1 }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: expect.objectContaining({ kind: "zoneCount", zone: "hand", op: "gte", value: 8 }) })] });
  });
});
