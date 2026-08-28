import { describe, expect, it } from "vitest";
import { compiled } from "./BT25-010.js";

describe("BT25-010 Hawkmon", () => {
  it("installs the your-turn evolution-cost reduction and inherited DP effect", () => {
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", actions: [{ mode: "reduceCost", amount: 1 }] }],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ amount: 2000 }] });
  });
});
