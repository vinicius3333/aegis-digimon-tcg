import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-044.js";

describe("BT13-044 BanchoLeomon", () => {
  it("uses the top security card for the DP reduction and reacts to security removal", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", keywords: [expect.objectContaining({ keyword: "Blocker" })], actions: [expect.objectContaining({ kind: "ModifyDP", amount: -6000, cost: expect.objectContaining({ kind: "trash", target: expect.objectContaining({ filter: expect.objectContaining({ zone: "security", position: "top" }) }) }) })] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved" })] });
  });
});
