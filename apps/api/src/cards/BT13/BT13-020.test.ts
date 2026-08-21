import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-020.js";

describe("BT13-020 ShineGreymon: Burst Mode", () => {
  it("is fully represented in compiled IR with the printed Burst Digivolve requirement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["ShineGreymon", "Marcus Damon"], cost: 0, isAlternate: true }]);
  });

  it("plays and binds Marcus for the temporary 12000 DP Digimon treatment", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "PlayWithoutCost", bindResultAs: "playedMarcus", from: ["hand"], payCost: false }),
      expect.objectContaining({ kind: "GrantStatic", grant: "kind", tokens: ["Digimon"], staticEffect: { kind: "SetBaseDP", value: 12000 } }),
      expect.objectContaining({ kind: "Restrict", restriction: "digivolve", duration: "forTheTurn" }),
      expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Rush" }), duration: "forTheTurn" }),
    ]));
  });

  it("declares the once-per-turn allied Tamer suspension security effect", () => {
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"] } })],
      }),
    ]));
  });
});
