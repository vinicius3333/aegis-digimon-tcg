import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-011.js";

describe("BT3-011 Greymon", () => {
  it("is played without cost after its security battle", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT3-011", as: "securityGreymon" }] },
      1: { battleArea: [{ card: "BT1-057", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const instanceId = s.inst("securityGreymon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId), 5000);

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
