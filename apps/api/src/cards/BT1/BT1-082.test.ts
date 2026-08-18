import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-082.js";

describe("BT1-082 Rosemon", () => {
  it("suspends an opposing Digimon when another opposing Digimon attacks the player while Rosemon is suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }], security: ["BT1-010"] }, 1: { battleArea: [{ card: "BT1-016", as: "attacker" }, { card: "BT1-017", as: "target" }] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
