import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-094.js";

describe("BT3-094 Ken Ichijoji", () => {
  it("sets memory to 3 at turn start and may suspend to gain memory after a blue battle win", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-094", as: "ken" },
            { card: "BT3-025", dp: 5000, as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", dp: 1000, suspended: true, as: "defender" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("ken"));
    expect(s.state.memory).toBe(3);

    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ken").isSuspended && s.state.memory === 4, 5000);

    expect(s.perm("ken").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-094", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
