import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-034.js";

describe("EX8-034", () => {
  it("plays an NSo Digimon costing 3 or less when digivolving and gives two opposing Digimon Security Attack -1 on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1, filter: { playCostLte: 3 } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, target: { count: 2 } });
  });
  it("inherits a once-per-turn -4000 DP attack effect", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }] }));
});
