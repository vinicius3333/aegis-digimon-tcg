import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-052.js";

describe("BT6-052 Entmon", () => {
  it("unsuspends after deleting an opposing Digimon in battle and can attack again", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-052", as: "entmon", dp: 10000 }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true }], security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("entmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;
    await settle(() => s.state.phase === Phase.Main && !combat.isAttacking && !s.perm("entmon").isSuspended, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("entmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
