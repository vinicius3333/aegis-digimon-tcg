import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-007.js";

describe("BT20-007 Dracomon", () => {
  it("requires the printed hand trash cost and resolves draw plus memory", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(main?.actions).toHaveLength(2);
    expect(main?.actions[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "trash" } });
    expect(main?.actions[0]?.optional).not.toBe(true);
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(main?.actions[1]?.optional).not.toBe(true);
  });
});
