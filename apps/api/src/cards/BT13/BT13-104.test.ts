import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-104.js";

describe("BT13-104 Final Shining Burst", () => {
  it("reduces one opposing Digimon by 12000 through the opponent's turn, then may play Marcus Damon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -12000, duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Marcus Damon"] }] }, count: 1 } });
  });

  it("activates its Main effect in security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({ kind: "ActivateMain" });
  });
});
