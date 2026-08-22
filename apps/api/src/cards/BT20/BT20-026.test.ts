import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-026.js";

describe("BT20-026 MegaSeadramon (X Antibody)", () => {
  it("returns level 4 or lower and conditionally restricts suspension on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 }, to: "deckBottom" }, { kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, restriction: "suspend", duration: "untilOpponentTurnEnd", condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["MegaSeadramon"], match: "name" }, { tokens: ["X Antibody"], match: "trait" }] } } }] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent", target: { isSelf: true } }] });
  });
});
