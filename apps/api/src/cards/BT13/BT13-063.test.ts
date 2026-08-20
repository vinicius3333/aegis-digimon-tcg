import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-063.js";

describe("BT13-063 Dorumon", () => {
  it("grants inherited DP only with X Antibody", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", while: expect.objectContaining({ kind: "selfHasTrait" }), effect: { kind: "modifyDP", amount: 1000 } })] });
  });
});
