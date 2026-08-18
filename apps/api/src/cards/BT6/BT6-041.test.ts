import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-041.js";

describe("BT6-041 Mistymon", () => {
  it("trashes top security to give an opposing Digimon -5000 DP when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-041", as: "mistymon" }], security: [{ card: "BT1-001", as: "security" }] },
      1: { battleArea: [{ card: "BT6-016", as: "target" }], security: ["BT1-010"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const baseDP = s.perm("target").baseDP;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("mistymon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 5000);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP - 5000);
  });
});
