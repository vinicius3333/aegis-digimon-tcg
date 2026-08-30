import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "./BT2-084.js";

describe("BT2-084 Sora Takenouchi", () => {
  it("suspends to give an attacking red Digimon +2000 DP when it attacks a player", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-084", as: "sora" },
            { card: "BT1-010", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const originalDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sora").isSuspended && s.perm("attacker").currentDP === originalDP + 2000);

    expect(s.perm("attacker").currentDP).toBe(originalDP + 2000);
  });

  it("Q1036 keeps the +2000 DP when the declared player attack is blocked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-084", as: "sora" },
            { card: "BT1-010", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-011"] },
      },
      { autoAcceptOptional: true },
    );
    const originalDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("attacker").currentDP).toBe(originalDP + 2000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not activate when the red Digimon attacks another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-084", as: "sora" },
          { card: "BT1-010", as: "attacker" },
        ],
      },
      1: { battleArea: [{ card: "BT1-011", as: "target", suspended: true }] },
    });
    const originalDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("sora").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(originalDP);
  });

  it("does not activate for a non-red attacker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-084", as: "sora" },
          { card: "BT2-020", as: "attacker" },
        ],
      },
      1: { security: [{ card: "BT1-001", as: "security" }] },
    });
    const originalDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("sora").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(originalDP);
  });

  it("may decline the DP bonus and keeps Sora unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-084", as: "sora" },
            { card: "BT1-010", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT1-001", as: "security" }] },
      },
      { autoDeclineOptional: true },
    );
    const originalDP = s.perm("attacker").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking);

    expect(s.perm("sora").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(originalDP);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-084", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
