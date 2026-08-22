import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-087.js";

describe("BT18-087 Owen Dreadnought", () => {
  it("covers memory setting, suspended cost, DP boundary, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourTurn" });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Delete", cost: { kind: "suspend" } }],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });
});
