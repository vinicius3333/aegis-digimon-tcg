import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-014.js";

describe("EX6-014 Gaomon", () => {
  it("plays a blue level 3 card from a blue Digimon's stack on play or digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { controller: "mine", colors: ["Blue"], levels: [3], hostFilter: { colors: ["Blue"] } } } });
    }
  });
  it("inherits a once-per-turn blue Digimon placement cost to unsuspend", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", optional: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" } }] });
  });
});
