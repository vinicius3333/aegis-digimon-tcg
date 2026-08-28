import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-040.js";

describe("BT1-040 WereGarurumon", () => {
  it("gains 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-040", as: "attacker" }] }, 1: { security: ["BT1-010"] } });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("still loses 3 memory at end of turn after being deleted in that attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "attacker" }] },
      1: { battleArea: [{ card: "BT1-084", as: "target", dp: 20000, suspended: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3 && s.state.players[0]!.battleArea.length === 0);
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnEndTurn,
    );
    expect(s.state.memory).toBe(0);
  });
});
