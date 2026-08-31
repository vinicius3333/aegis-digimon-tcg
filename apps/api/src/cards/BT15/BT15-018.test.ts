import { describe, expect, it } from "vitest";
import { EffectTiming, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT15-018 memory gates", () => {
  it("compiles each printed memory condition against the correct side", () => {
    const compiled = getCompiledCard("BT15-018");
    expect(compiled).toBeDefined();

    const conditions = compiled!.effects.map((effect) => effect.actions[0]!.condition);
    expect(conditions).toEqual([
      { kind: "memoryAtLeast", value: 4, controller: "opponent" },
      { kind: "memoryAtMost", value: 4, controller: "mine" },
    ]);
  });

  it("at exactly 4 opponent memory, deletes only one lowest-DP Digimon at end of own turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "second", dp: 4000 },
            { card: "BT1-009", as: "highest", dp: 5000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = -4;
    const lowestId = s.perm("lowest").permanentId;
    const secondId = s.perm("second").permanentId;

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("cannondramon"));
    await settle(() => !s.state.players[1]!.battleArea.some((card) => card.permanentId === lowestId));
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("cannondramon"));

    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toContain(secondId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("at exactly 4 own memory, deletes only the highest-play-cost Digimon at end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap", dp: 9000 },
            { card: "BT15-017", as: "expensive", dp: 1000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 4;
    const expensiveId = s.perm("expensive").permanentId;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("cannondramon"));
    await settle(() => !s.state.players[1]!.battleArea.some((card) => card.permanentId === expensiveId));

    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toEqual([s.perm("cheap").permanentId]);
  });

  it("does not delete at either end timing when the relevant owner-side memory is 5", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;

    s.state.turnSeat = 0;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("cannondramon"));
    s.state.turnSeat = 1;
    s.state.memory = -5;
    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("cannondramon"));

    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toEqual([targetId]);
  });

  it("resolves the end-of-your-turn deletion through public turn progression", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }], deck: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], deck: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 4;
    const targetId = s.perm("target").permanentId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = -4;
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[1]!.battleArea.some((card) => card.permanentId === targetId)).toBe(false);
  });
});
