import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
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

  it("applies the deletion debuff to every opposing target during the current opponent turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-074", as: "ruin" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "opponentA", dp: 10000 },
          { card: "BT1-009", as: "opponentB", dp: 11000 },
        ],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("ruin").permanentId]);

    expect(s.perm("opponentA").currentDP).toBe(5000);
    expect(s.perm("opponentB").currentDP).toBe(6000);

    await advance(s.engine).runTurn(1);
    expect(s.perm("opponentA").currentDP).toBe(5000);
    expect(s.perm("opponentB").currentDP).toBe(6000);

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    expect(s.perm("opponentA").currentDP).toBe(5000);
    expect(s.perm("opponentB").currentDP).toBe(6000);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("opponentA").currentDP).toBe(10000);
    expect(s.perm("opponentB").currentDP).toBe(11000);
  });
});
