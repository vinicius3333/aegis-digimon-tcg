import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-074.js";

describe("EX4-074 ShineGreymon: Ruin Mode", () => {
  it("gives opposing Digimon -5000 DP from When Digivolving and On Deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      tokens: ["get -5000DP"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      duration: "untilOpponentNextTurnEnd",
    });
  });
  it("at end of attack deletes itself and an opposing Digimon, adds security, and hatches with a Tamer", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions;
    expect(actions).toMatchObject([
      { kind: "Delete", target: { isSelf: true } },
      { kind: "Delete", target: { filter: { controller: "opponent" }, count: 1 } },
      { kind: "SecurityManipulation", op: "placeFromDeck", controller: "mine", amount: 1, toTop: true },
      { kind: "Hatch", condition: { kind: "youHave" } },
    ]);
  });
});
