import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-024.js";

describe("BT20-024 Seadramon (X Antibody)", () => {
  it("returns a level 3 Digimon and conditionally restricts a Tamer on both entry triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 }, to: "deckBottom" }, { kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 }, restriction: "suspend", duration: "untilOpponentTurnEnd", condition: { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["Seadramon"], match: "name" }, { tokens: ["X Antibody"], match: "trait" }] } } }] });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Draw", condition: { op: "lte", value: 7 } }] });
  });
});
