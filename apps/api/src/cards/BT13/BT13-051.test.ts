import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-051.js";

describe("BT13-051 Mikemon", () => {
  it("grants temporary Piercing and preserves the inherited trait aura", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Piercing" }), duration: "forTheTurn" })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [expect.objectContaining({ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 } })] });
  });
});
