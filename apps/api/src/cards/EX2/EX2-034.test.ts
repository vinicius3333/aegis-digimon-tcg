import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-034.js";
import "./EX2-031.js";

describe("EX2-034 Andromon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-034", as: "andromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("andromon"), "Blocker")).toBe(true);
  });

  it("gives all your Blockers +2000 DP only during the opponent's turn", async () => {
    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-034", as: "andromon" },
          { card: "EX2-031", as: "guardromon" },
        ],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-001"] },
    });
    await ownTurn.ready();
    expect(ownTurn.perm("andromon").currentDP).toBe(6000);
    expect(ownTurn.perm("guardromon").currentDP).toBe(4000);

    const opponentsTurn = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-034", as: "andromon" },
          { card: "EX2-031", as: "guardromon" },
        ],
        deck: ["BT1-001"],
      },
      1: { deck: ["BT1-001"] },
    });
    opponentsTurn.state.turnSeat = 1;
    await opponentsTurn.ready();
    expect(opponentsTurn.perm("andromon").currentDP).toBe(8000);
    expect(opponentsTurn.perm("guardromon").currentDP).toBe(6000);
  });

  it("materializes the Blocker aura after a production turn transition", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-034", as: "andromon" },
          { card: "EX2-031", as: "guardromon" },
        ],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-003"],
      },
      1: { deck: ["BT1-004", "BT1-005"], hand: ["BT1-009"], security: ["BT1-006"] },
    });
    await s.ready();

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.turnSeat).toBe(1);
    await settle(() => s.perm("andromon").currentDP === 8000);
    expect(s.perm("andromon").currentDP).toBe(8000);
    expect(s.perm("guardromon").currentDP).toBe(6000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
