import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-028.js";

describe("BT24-028 Divermon", () => {
  it("requires the qualifying hand placement on entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(action.kind).toBe("GainKeyword");
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
      expect(action.additionalEffect).toMatchObject({ kind: "GrantStatic", modifier: "cannotBeDeletedInBattle" });
    }
  });

  it("keeps the inherited TS play effect scoped to this stack", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      fromHost: "self",
      optional: true,
    });
    expect(action.target.filter).toMatchObject({ colors: ["Blue"], levelComparison: { op: "lte", value: 4 } });
  });
});
