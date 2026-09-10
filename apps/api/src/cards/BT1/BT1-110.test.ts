import { EffectDuration, EffectTiming, Phase, type AttackTarget } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-031.js";
import "./BT1-110.js";

describe("BT1-110 Flower Cannon", () => {
  it("suspends one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-110", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("suspends every opposing non-Blocker but leaves Blockers unsuspended from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-110", as: "securityOption", faceUp: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "nonBlocker" },
          { card: "BT1-031", as: "blocker" },
        ],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("nonBlocker").isSuspended).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("resolves the Security effect through a public attack and trashes the revealed Option", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-110", as: "securityOption" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "nonBlocker" },
            { card: "BT1-031", as: "blocker", suspended: true },
            { card: "BT1-009", dp: 20000, as: "attacker" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.phase = Phase.Main;
    s.state.turnSeat = 1;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" } satisfies AttackTarget,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0, 600);

    expect(s.perm("nonBlocker").isSuspended).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(
      true,
    );
  });

  it("does not suspend a Digimon that gained Blocker from another effect (Q981)", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-110", as: "securityOption", faceUp: true }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "grantedBlocker" },
          { card: "BT1-011", as: "ordinary" },
        ],
      },
    });
    advance(s.engine).ledgers.continuous.addKeywordGrant(
      s.perm("grantedBlocker").permanentId,
      "Blocker",
      EffectDuration.Permanent,
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("grantedBlocker").isSuspended).toBe(false);
    expect(s.perm("ordinary").isSuspended).toBe(true);
  });

  it("can use Main on an already suspended opposing Digimon and resolves as a no-op", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-067"], hand: [{ card: "BT1-110", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const option = s.inst("option");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === option.instanceId));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
