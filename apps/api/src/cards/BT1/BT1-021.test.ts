import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-021.js";

describe("BT1-021 MetalGreymon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("loses the 3 gained memory at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    const engine = s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> };
    await engine.fireTiming(EffectTiming.OnEndTurn);
    expect(s.state.memory).toBe(0);
  });

  it("still pays the delayed 3 memory after being deleted by the security battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "attacker", dp: 7000 }] }, 1: { security: ["BT1-025"] } });
    s.state.memory = 0;
    const attackerId = s.perm("attacker").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    const engine = s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> };
    await engine.fireTiming(EffectTiming.OnEndTurn);
    expect(s.state.memory).toBe(0);
  });
});
