import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-079.js";

describe("BT1-079 Lillymon", () => {
  it("suspends an opposing Digimon without Blocker when its Digimon attacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-081", as: "attacker", under: ["BT1-079"] }] }, 1: { battleArea: [{ card: "BT1-016", as: "target" }], security: ["BT1-010"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
