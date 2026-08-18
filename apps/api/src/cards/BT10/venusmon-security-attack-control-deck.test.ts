import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-074.js";
import "./BT10-013.js";
import "./BT10-042.js";

describe("BT10 Venusmon security-attack control deck gauntlet", () => {
  it("evolves from Boutmon, suppresses timings, but only forbids attacks aimed at Venusmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-074", as: "boutmon", suspended: true },
            { card: "BT1-043", as: "otherTarget", suspended: true },
          ],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: 3,
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT10-013", as: "shoutmonX5" },
            { card: "BT1-010", as: "plainAttacker" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("boutmon").permanentId,
      instanceId: s.inst("venusmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("boutmon").topCard.cardId === "BT10-042" &&
      observe(s.engine).keywordAmount(s.perm("plainAttacker"), "SecurityAttack") === -1
    );

    // X5 has printed SA+1 and Venusmon's SA-1. The numeric total is zero, but Q1966 says
    // it still HAS Security Attack; both it and the plain body that received SA-1 are gated.
    expect(observe(s.engine).keywordAmount(s.perm("shoutmonX5"), "SecurityAttack")).toBe(0);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).timingEffectDisabled(s.perm("shoutmonX5"), "whenAttacking")).toBe(true);
    expect(observe(s.engine).timingEffectDisabled(s.perm("plainAttacker"), "whenDigivolving")).toBe(true);
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("shoutmonX5").permanentId,
      target: { kind: "permanent", permanentId: s.perm("boutmon").permanentId },
    })).toEqual({ ok: false, reason: "illegal-target" });

    // The same affected attacker may attack a different suspended Digimon.
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("shoutmonX5").permanentId,
      target: { kind: "permanent", permanentId: s.perm("otherTarget").permanentId },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // A separately affected body may still attack the player: Venusmon never says
    // "can't attack", only "can't attack this Digimon".
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("plainAttacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("plainAttacker").isSuspended).toBe(true);
    // Its SA-1 correctly makes the legal player attack perform zero security checks.
    expect(s.state.players[0]!.security).toHaveLength(3);
  });
});
