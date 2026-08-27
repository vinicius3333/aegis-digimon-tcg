import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-048.js";

describe("BT4-048 WarGreymon", () => {
  it("takes top security to hand, unsuspends, and applies -6000 DP only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-048", as: "war" }],
          security: [{ card: "BT1-001", as: "securityTop" }, "BT1-002"],
        },
        1: { battleArea: [{ card: "BT2-083", dp: 12000, as: "target" }], security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const war = s.perm("war");
    const target = s.perm("target");
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: war.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        !(s.engine as any).combat.isAttacking &&
        !war.isSuspended &&
        target.currentDP === target.baseDP - 6000,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: war.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => war.isSuspended);

    expect(target.currentDP).toBe(target.baseDP - 6000);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
