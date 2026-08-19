import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-013.js";

describe("BT24-013 Fugamon", () => {
  it("requires the hand-trash cost before deleting a 6000-DP-or-less opponent Digimon", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        abortOnDecline: true,
        cost: { kind: "trash" },
      });
      expect(actions[0].optional).toBeUndefined();
      expect(actions[0].target.filter.dp).toEqual({ op: "lte", value: 6000 });
    }
  });

  it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0].actions[0];
    expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
  });
});
