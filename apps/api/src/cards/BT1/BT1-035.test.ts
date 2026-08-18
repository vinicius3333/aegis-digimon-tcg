import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-035.js";

describe("BT1-035 Leomon", () => {
  it("gains 2 memory when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-035", as: "leomon", dp: 1000, suspended: true }] }, 1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 20000 }] } });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("leomon").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.memory === -2);
    expect(s.state.memory).toBe(-2);
  });
});
