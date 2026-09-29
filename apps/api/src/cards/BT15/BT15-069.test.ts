import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-069.js";
import "../index.js";

describe("BT15-069", () => {
  it("draws when the opponent has 1 or less memory, otherwise gains 1 memory", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "memoryAtMost", controller: "opponent", value: 1 },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "memoryAtLeast", controller: "opponent", value: 1 },
    });
  });

  it("draws and gains memory at the one-memory boundary when battle naturally deletes Candlemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-069", as: "candlemon", dp: 2000, suspended: true }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("candlemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("candlemon").permanentId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(0);
  });
});

/**
 * A player with negative memory cannot attack, so the battle that deletes Candlemon is on
 * Candlemon's side of the turn while its owner has memory, and on the opponent's side otherwise.
 */
async function deleteCandlemonInBattle(ownerMemory: number) {
  const candlemonOwnerAttacks = ownerMemory >= 0;
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-069", as: "candlemon", dp: 2000, suspended: !candlemonOwnerAttacks }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon", dp: 3000, suspended: candlemonOwnerAttacks }] },
    },
    { autoSelectCards: true },
  );
  const turnSeat = candlemonOwnerAttacks ? 0 : 1;
  s.state.turnSeat = turnSeat;
  s.state.memory = candlemonOwnerAttacks ? ownerMemory : -ownerMemory;
  const candlemon = s.perm("candlemon");
  const opponentDigimon = s.perm("opponentDigimon");
  const attacker = candlemonOwnerAttacks ? candlemon : opponentDigimon;
  const defender = candlemonOwnerAttacks ? opponentDigimon : candlemon;

  expect(
    s.engine.applyIntent(turnSeat, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: defender.permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("candlemon").permanentId) &&
      s.state.pendingDecision === undefined,
  );

  // `0 - memory` keeps a zero result as +0, which `toEqual` distinguishes from -0.
  return {
    drew: s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    opponentMemoryAfter: candlemonOwnerAttacks ? 0 - s.state.memory : s.state.memory,
  };
}

describe("BT15-069 Candlemon — KB Q&A rulings", () => {
  it("draws when memory is anywhere from 10 on my side to 1 on the opponent's side (Q2556)", async () => {
    for (const ownerMemory of [10, 3, 0, -1]) {
      expect((await deleteCandlemonInBattle(ownerMemory)).drew, `owner memory ${ownerMemory}`).toBe(true);
    }
    expect((await deleteCandlemonInBattle(-2)).drew).toBe(false);
  });

  it("both draws and gains 1 memory when the opponent has exactly 1 memory (Q2557)", async () => {
    expect(await deleteCandlemonInBattle(-1)).toEqual({ drew: true, opponentMemoryAfter: 0 });
    expect(await deleteCandlemonInBattle(-2)).toEqual({ drew: false, opponentMemoryAfter: 1 });
    expect(await deleteCandlemonInBattle(0)).toEqual({ drew: true, opponentMemoryAfter: 0 });
  });
});
