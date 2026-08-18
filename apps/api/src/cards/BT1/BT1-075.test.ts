import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-075.js";

describe("BT1-075 Digitamamon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-075", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("loses 3 memory at end of turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-075", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnEndTurn);
    expect(s.state.memory).toBe(0);
  });
});
