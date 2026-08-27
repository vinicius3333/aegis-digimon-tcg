import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-027.js";

describe("BT3-027 Paildramon", () => {
  it("has Jamming and unsuspends its Imperialdramon host when attacking", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-027", as: "paildramon" },
          { card: "BT3-031", as: "imperial", under: ["BT3-027"] },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("paildramon"), "Jamming")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("imperial").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("imperial").isSuspended, 5000);

    expect(s.perm("imperial").isSuspended).toBe(false);
  });

  it("does not unsuspend a non-Imperialdramon host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "host", under: ["BT3-027"] }] },
      1: { security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not trigger its inherited effect a second time in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-027", as: "paildramon" },
          { card: "BT3-031", as: "imperial", under: ["BT3-027"] },
        ],
      },
      1: { security: ["BT1-010", "BT1-011"] },
    });
    const attackerId = s.perm("imperial").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("imperial").isSuspended).toBe(false);

    s.perm("imperial").isSuspended = true;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("imperial").isSuspended).toBe(true);
  });
});
