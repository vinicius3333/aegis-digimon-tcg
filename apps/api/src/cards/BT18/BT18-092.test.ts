import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-092.js";

describe("BT18-092 Zenith", () => {
  it("covers Vemmon discard draw, attack cost, dedigivolve, and security play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "Draw", amount: 1, cost: { kind: "trash" } },
        { kind: "GainMemory", amount: 1 },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "DeDigivolve", amount: 1, cost: { kind: "suspend" } }],
    });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Security", isSecurity: true });
  });
});
