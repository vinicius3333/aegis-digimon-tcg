import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-085.js";

describe("BT8-085 Yolei Inoue", () => {
  it("suspends when a multicolor Digimon attacks to delete a 3000-DP-or-lower Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-085", as: "yolei" }, { card: "BT8-015", as: "attacker" }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target", dp: 3000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("yolei").isSuspended).toBe(true);
  });
});
