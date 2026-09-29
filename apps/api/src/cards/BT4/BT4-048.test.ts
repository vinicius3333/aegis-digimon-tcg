import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
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

  it("does not resolve the remaining effect when its security cost is unpayable", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-048", as: "war" }] },
        1: { battleArea: [{ card: "BT2-083", dp: 12000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const war = s.perm("war");
    const target = s.perm("target");
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: war.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.phase === Phase.Main && !(s.engine as any).combat.isAttacking);

    expect(war.isSuspended).toBe(true);
    expect(target.currentDP).toBe(target.baseDP);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});

describe("BT4-048 WarGreymon — KB Q&A rulings", () => {
  const setupAttack = (ownSecurity: string[], options: SetupEngineOptions) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-048", as: "war" }],
          security: ownSecurity.map((card, index) => (index === 0 ? { card, as: "securityTop" } : card)),
        },
        1: { battleArea: [{ card: "BT2-083", dp: 12000, as: "target" }], security: ["BT1-010", "BT1-011"] },
      },
      options,
    );
    s.state.memory = 3;
    return s;
  };

  const attackPlayer = (s: ReturnType<typeof setupEngine>) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("war").permanentId,
      target: { kind: "player" },
    });

  const attackEnded = (s: ReturnType<typeof setupEngine>) =>
    s.state.phase === Phase.Main && !(s.engine as any).combat.isAttacking;

  const optionalPromptsFor = (s: ReturnType<typeof setupEngine>) =>
    s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional");

  it("lets you choose not to activate its [When Attacking] effect (Q1209)", async () => {
    const s = setupAttack(["BT1-001", "BT1-002"], { autoDeclineOptional: true, autoSelectCards: true });

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => attackEnded(s));

    expect(optionalPromptsFor(s)).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("war").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });

  it("cannot activate its [When Attacking] effect with no security cards to add to hand (Q1210)", async () => {
    const s = setupAttack([], { autoAcceptOptional: true, autoSelectCards: true });

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => attackEnded(s));

    expect(optionalPromptsFor(s)).toHaveLength(0);
    expect(s.perm("war").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);

    const control = setupAttack(["BT1-001"], { autoAcceptOptional: true, autoSelectCards: true });
    expect(attackPlayer(control)).toEqual({ ok: true });
    await settle(() => attackEnded(control) && !control.perm("war").isSuspended);
    expect(optionalPromptsFor(control)).toHaveLength(1);
    expect(control.perm("target").currentDP).toBe(control.perm("target").baseDP - 6000);
  });

  it("does not give an additional -6000 DP on a second attack in the same turn (Q1211)", async () => {
    const s = setupAttack(["BT1-001", "BT1-002"], { autoAcceptOptional: true, autoSelectCards: true });
    const war = s.perm("war");
    const target = s.perm("target");

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => attackEnded(s) && !war.isSuspended);
    expect(target.currentDP).toBe(target.baseDP - 6000);
    expect(optionalPromptsFor(s)).toHaveLength(1);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => attackEnded(s) && war.isSuspended);

    expect(optionalPromptsFor(s)).toHaveLength(1);
    expect(target.currentDP).toBe(target.baseDP - 6000);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
