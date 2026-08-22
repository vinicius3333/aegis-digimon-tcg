import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-025.js";

describe("EX10-025 Sunarizamon", () => {
  it("proves the two-card Mineral/Rock placement and inherited discard trigger", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({ actions: [{
      kind: "PlaceUnder", from: ["trash"], count: 2, optional: true,
      target: { filter: { controller: "mine", zone: "trash", nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] } },
      underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] },
    }] });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({ actions: [{ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] }, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 } }] }] });
  });
});
