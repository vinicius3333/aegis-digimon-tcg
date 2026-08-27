import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-046.js";

describe("BT14-046", () => {
  it("registers the before-pay-cost suspend reduction and inherited green-Tamer evo reduction", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      amount: 3,
      cost: { kind: "suspend" },
    });
    expect(compiled.effects[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", amount: 1 }],
    });
  });
});
