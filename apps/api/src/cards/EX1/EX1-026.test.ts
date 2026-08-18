import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-026.js";

describe("EX1-026 Gatomon", () => {
  it("gives an opposing Digimon -2000 DP on attack with 3 or more security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-026"] }], security: ["BT1-001", "BT1-001", "BT1-001"] }, 1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-001", "BT1-001"] } }, { autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
