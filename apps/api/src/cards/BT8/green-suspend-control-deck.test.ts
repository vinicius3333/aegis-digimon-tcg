import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-110.js";
import "../BT1/BT1-113.js";
import "../BT10/BT10-052.js";
import "./BT8-099.js";

describe("historical green suspend-control deck", () => {
  it("redirects an attack, filters Blocker, locks unsuspend, then bottoms the suspended board", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-052", as: "cherrymon", suspended: true },
            "BT8-012",
            "BT8-016",
          ],
          hand: [{ card: "BT8-099", as: "gigaDeath" }],
          security: [
            { card: "BT1-110", as: "flower", faceUp: true },
            { card: "BT1-113", as: "temptation", faceUp: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 1000 },
            { card: "BT1-010", as: "nonBlocker" },
            { card: "BT1-023", as: "blocker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cherrymon").permanentId);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009") &&
        !observe(s.engine).isAttacking(),
    );
    preferred.length = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("flower"));
    expect(s.perm("nonBlocker").isSuspended).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(false);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("temptation"));
    expect(observe(s.engine).isRestricted(s.perm("nonBlocker"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "unsuspend")).toBe(true);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    preferred.push(s.perm("blocker").permanentId, s.perm("nonBlocker").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gigaDeath").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
