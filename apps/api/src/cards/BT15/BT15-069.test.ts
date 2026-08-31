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
          deck: [{ card: "BT1-001", as: "drawn" }],
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
