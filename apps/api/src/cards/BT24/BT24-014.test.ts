import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-014.js";

describe("BT24-014 Aegiochusmon", () => {
  it("applies the DP reduction then conditionally deletes at three or fewer security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -5000 });
    expect(effect.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "zoneCount", zone: "security", op: "lte", value: 3 },
    });
  });

  it("implements Decode by playing Aegiomon from the stack on non-battle removal", () => {
    const replacement = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as any;
    expect(replacement).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanBattle" });
    expect(replacement.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      optional: true,
    });
    expect(replacement.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Aegiomon"], match: "name" }]);
  });
});
