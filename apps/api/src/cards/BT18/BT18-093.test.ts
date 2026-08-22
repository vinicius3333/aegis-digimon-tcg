import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-093.js";

describe("BT18-093 Violet Inboots", () => {
  it("covers memory setting, hand discard draw, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourTurn" });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Draw", amount: 1, cost: { kind: "trash" } }],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });
});
