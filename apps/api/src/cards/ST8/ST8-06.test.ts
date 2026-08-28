import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST8-06.js";
import "./ST8-09.js";

describe("ST8-06 Coredramon", () => {
  it("draws 2 on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST8-06", as: "core" }], deck: ["ST8-01", "ST8-02"] } });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("core").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
  });

  it("plays itself from security and resolves Draw 2", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST8-06", as: "core", faceUp: true }], deck: ["ST8-01", "ST8-02"] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("core"));
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("core").instanceId)).toBe(true);
  });

  it("plays after its security battle, then fires its On Play Draw 2 before the attack ends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST8-09", as: "attacker" }] },
      1: {
        security: [{ card: "ST8-06", as: "core" }],
        deck: ["ST8-01", "ST8-02"],
      },
    });
    await s.ready();
    const coreInstanceId = s.inst("core").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === coreInstanceId) &&
        s.state.players[1]!.hand.length === 2,
      3000,
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === coreInstanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("attacker").permanentId)).toBe(true);
  });
});
