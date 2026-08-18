import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-013.js";

describe("BT3-013 Duramon", () => {
  it("gives Security Attack +1 to its level 7 host on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT3-013"] }] } });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 to a level 6 host or during the opponent's turn", async () => {
    const lower = setupEngine({ 0: { battleArea: [{ card: "BT3-111", as: "host", under: ["BT3-013"] }] } });
    await lower.engine.recomputeContinuousEffects();
    expect(observe(lower.engine).keywordAmount(lower.perm("host"), "SecurityAttack")).toBe(0);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT1-084", as: "host", under: ["BT3-013"] }] } });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.engine.recomputeContinuousEffects();
    expect(observe(opponentTurn.engine).keywordAmount(opponentTurn.perm("host"), "SecurityAttack")).toBe(0);
  });
});
