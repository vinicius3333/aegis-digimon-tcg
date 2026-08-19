import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-029.js";

describe("BT24-029 Whamon", () => {
  it("requires the qualifying hand card placement for both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)?.actions?.[0] as any;
      expect(action.kind).toBe("Restrict");
      expect(action.target.filter.kind).toEqual(["Digimon", "Tamer"]);
      expect(action.cost).toMatchObject({ kind: "place", destination: "digivolutionStack", position: "bottom" });
      expect(action.cost.optional).toBeUndefined();
      expect(action.cost.abortOnDecline).toBeUndefined();
    }
  });

  it("plays qualifying TS cards from its digivolution cards", () => {
    const endOfAttack = compiled.effects.find((effect) => effect.trigger === "EndOfAttack")?.actions?.[0] as any;
    const inherited = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")?.actions?.[0] as any;
    expect(endOfAttack).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], optional: true });
    expect(inherited.target.filter).toMatchObject({ levelComparison: { op: "lte", value: 4 }, colors: ["Blue"] });
  });
});
