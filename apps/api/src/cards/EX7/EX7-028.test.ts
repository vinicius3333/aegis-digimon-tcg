import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-028.js";

describe("EX7-028", () => {
  it("plays a yellow NSp Digimon costing 4 or less from hand on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1, filter: { colors: ["Yellow"], playCostLte: 4 } } }));
  it("inherits a once-per-turn attack effect that gives an opposing Digimon -4000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -4000 }] }));
});
