import { describe, expect, it } from "vitest";
import { compiled as BT24_033 } from "./BT24-033.js";

describe("BT24-033 Salamon", () => {
  it("reduces your-turn Iliad digivolution costs by one", () => {
    const effect = BT24_033.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({
      event: "wouldDigivolve",
      into: { nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
      actions: [{ mode: "reduceCost", amount: 1 }],
    });
    expect(BT24_033.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Barrier");
  });
});
