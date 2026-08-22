import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-079.js";
describe("BT21-079 Megidramon", () => {
  it("has Security Attack plus one, wipes opposing Digimon, and recurs Guilmon family", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "EndOfAttack",
        frequency: "OncePerTurn",
        actions: [{ kind: "Delete", target: expect.objectContaining({ count: "all" }) }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: expect.arrayContaining([
          expect.objectContaining({
            kind: "PlayWithoutCost",
            from: ["trash"],
            target: expect.objectContaining({
              filter: expect.objectContaining({
                playCostLte: 3,
                nameOrTrait: [{ tokens: ["Guilmon", "Growlmon"], match: "name" }],
              }),
            }),
            playCostCeiling: expect.objectContaining({
              base: 3,
              raise: 2,
              per: 10,
              filter: { zone: "trash", controller: "both" },
              unit: "cards",
            }),
          }),
        ]),
      }),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Growlmon"], cost: 4, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
