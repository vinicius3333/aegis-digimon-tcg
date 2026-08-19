import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-027.js";

describe("BT24-027 Lanamon", () => {
  it("requires the qualifying hand placement on entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
    }
  });

  it("implements Decode by playing Calmaramon from the stack on non-battle removal", () => {
    const decode = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(decode).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      sourceFilter: { isSelfRef: true },
    });
    expect(decode.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
    expect(decode.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Calmaramon"], match: "name" }]);
  });
});
