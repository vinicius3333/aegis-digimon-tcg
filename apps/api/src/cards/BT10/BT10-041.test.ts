import { describe, expect, it } from "vitest";
import { compiled } from "./BT10-041.js";

describe("BT10-041 Sakuyamon: Maid Mode", () => {
  it("uses an eligible hand Option and places the used card on top of security", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions).toEqual([
      expect.objectContaining({ kind: "UseOptionWithoutCost", optional: true }),
      expect.objectContaining({
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        source: "lastOptionUsed",
        from: ["trash"],
        condition: { kind: "ifThisEffectUsed" },
      }),
    ]);
  });

  it("offers requirement-free Sakuyamon evolution for cost 1 when attacking", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      costOverride: 1,
      ignoreRequirements: true,
      optional: true,
    });
  });
});
