import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-003.js";

describe("BT5-003 Pickmon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks with 3 Digimon in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "host", under: ["BT5-003"] }, "BT1-009", "BT1-010"] }, 1: { battleArea: [{ card: "BT4-076", as: "target" }], security: ["BT1-011"] } }, { autoSelectCards: true });
    const target = s.perm("target");
    const before = target.currentDP;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 1000);
    expect(target.currentDP).toBe(before - 1000);
  });
});
