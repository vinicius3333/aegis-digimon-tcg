import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-052.js";
import "./BT4-059.js";

describe("BT4-052 Lalamon", () => {
  it("returns itself to hand after it is trashed for Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-059", as: "lila", under: ["BT1-001", { card: "BT4-052", as: "lala" }] }] },
        1: { battleArea: [{ card: "BT1-009" }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("lila").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-059/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lila").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lala").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lala").instanceId)).toBe(true);
  });
});
