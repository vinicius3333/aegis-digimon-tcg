import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-027.js";

describe("BT6-027 Majiramon", () => {
  it("trashes the top source of an opposing Digimon when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-010", as: "base" }], hand: [{ card: "BT6-027", as: "evolving" }] },
      1: { battleArea: [{ card: "BT2-020", under: ["BT1-010", "BT1-011"], as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack[0]?.cardId).toBe("BT1-010");
  });

  it("its inherited effect permits exactly one reattack when the opponent has no Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-029", as: "host", under: ["BT6-027"] }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    }, { autoSelectCards: true });
    const host = s.perm("host");
    const combat = (s.engine as unknown as { combat: { isAttacking: boolean } }).combat;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !combat.isAttacking && !host.isSuspended, 5000);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !combat.isAttacking && host.isSuspended, 5000);

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }).ok).toBe(false);
  });
});
