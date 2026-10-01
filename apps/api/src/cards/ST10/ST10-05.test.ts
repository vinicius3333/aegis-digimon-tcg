import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-05.js";

describe("ST10-05 Angewomon", () => {
  it("gives an opposing Digimon Security Attack -2 on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST10-05", as: "angewomon" }] }, 1: { battleArea: [{ card: "ST10-07", as: "target" }] } },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
  });

  it("gives its host Security Attack +1 while you have a purple Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-06", as: "host", under: ["ST10-05"] },
            { card: "ST10-07", as: "purple" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("keeps Security Attack -2 through the opponent's turn and clears it when that turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST10-05", as: "angewomon" }] },
        1: { battleArea: [{ card: "ST10-07", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angewomon"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);

    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });
});

function setupTurnLoopBoard() {
  const deck = ["BT1-013", "BT1-014", "BT1-015", "BT1-013", "BT1-014"];
  return setupEngine(
    {
      0: { deck, hand: ["ST10-07"], battleArea: [{ card: "ST10-05", as: "angewomon" }] },
      1: { deck, hand: ["ST10-07"], battleArea: [{ card: "ST10-07", as: "target" }] },
    },
    { autoSelectCards: true },
  );
}

describe("ST10-05 Angewomon — KB Q&A rulings", () => {
  it("activates its inherited effect when the Digimon carrying it is itself purple (Q732)", async () => {
    const purpleHost = setupEngine({ 0: { battleArea: [{ card: "ST10-06", as: "host", under: ["ST10-05"] }] } });
    await purpleHost.ready();
    expect(observe(purpleHost.engine).keywordAmount(purpleHost.perm("host"), "SecurityAttack")).toBe(1);

    const redHost = setupEngine({ 0: { battleArea: [{ card: "ST1-08", as: "host", under: ["ST10-05"] }] } });
    await redHost.ready();
    expect(observe(redHost.engine).keywordAmount(redHost.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("lasts only until the end of the current turn when activated on the opponent's turn (Q733)", async () => {
    const onOpponentTurn = setupTurnLoopBoard();
    const opponentTurn = advance(onOpponentTurn.engine);
    const target = () => observe(onOpponentTurn.engine).keywordAmount(onOpponentTurn.perm("target"), "SecurityAttack");
    onOpponentTurn.engine.startTurnLoop();
    await opponentTurn.waitForMainPhase(0);
    opponentTurn.endMainPhaseIfOpen(0);
    await opponentTurn.waitForMainPhase(1);
    expect(onOpponentTurn.state.turnSeat).toBe(1);
    await opponentTurn.fire(EffectTiming.OnPlay, onOpponentTurn.perm("angewomon"));
    expect(target()).toBe(-2);
    opponentTurn.endMainPhaseIfOpen(1);
    await opponentTurn.waitForMainPhase(0);
    expect(target()).toBe(0);

    const onOwnTurn = setupTurnLoopBoard();
    const ownTurn = advance(onOwnTurn.engine);
    const ownTarget = () => observe(onOwnTurn.engine).keywordAmount(onOwnTurn.perm("target"), "SecurityAttack");
    onOwnTurn.engine.startTurnLoop();
    await ownTurn.waitForMainPhase(0);
    expect(onOwnTurn.state.turnSeat).toBe(0);
    await ownTurn.fire(EffectTiming.OnPlay, onOwnTurn.perm("angewomon"));
    expect(ownTarget()).toBe(-2);
    ownTurn.endMainPhaseIfOpen(0);
    await ownTurn.waitForMainPhase(1);
    expect(ownTarget()).toBe(-2);
    ownTurn.endMainPhaseIfOpen(1);
    await ownTurn.waitForMainPhase(0);
    expect(ownTarget()).toBe(0);
  });
});
