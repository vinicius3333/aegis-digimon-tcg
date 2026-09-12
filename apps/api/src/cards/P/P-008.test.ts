import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-008.js";

describe("P-008 WereGarurumon", () => {
  it("unsuspends with exact Garurumon and grants inherited Security Attack +1 at 8 cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-008", as: "exact", under: ["BT1-036"] },
          { card: "BT1-044", as: "inheritedHost", under: ["P-008"] },
        ],
        hand: Array.from({ length: 8 }, () => "ST1-16"),
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("inheritedHost"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exact").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("exact").isSuspended);
    expect(s.perm("exact").isSuspended).toBe(false);

    const removedHandCardId = s.state.players[0]!.hand[0]!.instanceId;
    await advance(s.engine).verb.returnToDeck([removedHandCardId]);
    await advance(s.engine).recompute();
    expect(observe(s.engine).keywordAmount(s.perm("inheritedHost"), "SecurityAttack")).toBe(0);
  });

  it("does not unsuspend with Garurumon (X Antibody)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-008", as: "attacker", under: ["BT9-024"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").isSuspended).toBe(true);
  });

  it("denies a second unsuspend that turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-008", as: "attacker", under: ["BT1-036"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    };

    await attack();
    expect(s.perm("attacker").isSuspended).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    await attack();
    expect(s.perm("attacker").isSuspended).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    await attack();
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
