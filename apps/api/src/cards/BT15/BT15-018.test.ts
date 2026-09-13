import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-018.js";

describe("BT15-018 memory gates", () => {
  it("digivolves legally from a red level-5 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-016", as: "redBase" }],
        hand: [{ card: "BT15-018", as: "cannondramon" }],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("cannondramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redBase").topCard?.cardId === "BT15-018");

    expect(s.perm("redBase").topCard?.cardId).toBe("BT15-018");
    expect(s.perm("redBase").stack.map((card) => card.cardId)).toEqual(["BT15-016"]);
    expect(s.perm("redBase").stack[0]?.instanceId).toBe(s.inst("redBase").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("compiles each printed memory condition against the correct side", () => {
    const conditions = compiled.effects.map((effect) => effect.actions[0]!.condition);
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
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], deck: ["BT1-010"] },
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

  it("repeats the memory-gated end-of-your-turn deletion after a real intervening turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", dp: 3000 },
            { card: "BT1-009", as: "secondTarget", dp: 4000 },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 4;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = -4;
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId)).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 4;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = -4;
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId)).toBe(false);
  });

  it("naturally deletes the highest-play-cost opposing Digimon at each opponent end step when own memory is at most 4", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-018", as: "cannondramon" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap", dp: 9000 },
            { card: "ST3-08", as: "firstExpensive", dp: 1000 },
            { card: "ST3-08", as: "secondExpensive", dp: 1000 },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 4;
    const firstExpensiveId = s.perm("firstExpensive").permanentId;
    const secondExpensiveId = s.perm("secondExpensive").permanentId;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstExpensiveId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondExpensiveId)).toBe(true);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondExpensiveId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
