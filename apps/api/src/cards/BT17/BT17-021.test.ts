import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-021.js";

describe("BT17-021", () => {
  it("draws by placing a Seasarmon or level 3 blue Digimon under itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Draw", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self", target: { filter: { orFilters: [{ colors: ["Blue"], levels: [3] }] } } } }] });
  });

  it("gains memory when attacking with Jamming as inherited once per turn", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfHasKeyword", keyword: "Jamming" } }] });
  });
});
