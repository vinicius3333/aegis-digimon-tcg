import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-024.js";

describe("BT24-024 Submarimon", () => {
  it("plays a TS Tamer from hand with a once-per-turn cost reduction", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
    });
    expect(effect.actions[0].target.filter).toMatchObject({
      kind: ["Tamer"],
      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
    });
  });

  it("retains Armor Purge and both alternate digivolution requirements", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Armor Purge");
    expect(compiled.digivolutionRequirement ?? []).toHaveLength(2);
  });
});
