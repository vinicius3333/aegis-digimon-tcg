import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-023.js";

describe("BT24-023 Calmaramon", () => {
  it("gates the follow-up suspend restriction on effect-played entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[1].condition).toMatchObject({ kind: "triggerEnteredByEffect" });
      expect(actions[1].restriction).toBe("suspend");
    }
  });

  it("implements Decode by playing Lanamon from the stack on non-battle removal", () => {
    const decode = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(decode).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanBattle" });
    expect(decode.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
    expect(decode.actions[0].target.filter.nameOrTrait).toEqual([{ tokens: ["Lanamon"], match: "name" }]);
  });
});
