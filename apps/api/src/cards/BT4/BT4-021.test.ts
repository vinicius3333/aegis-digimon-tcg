import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-021.js";
import "./BT4-026.js";

describe("BT4-021 Gaomon", () => {
  it("returns itself to hand after it is trashed for Digi-Burst", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-026", as: "gao", under: ["BT1-001", { card: "BT4-021", as: "source" }] }], deck: ["BT1-009"] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(s.perm("gao").topCard!)).find((effect) => effect.effectKey.startsWith("BT4-026/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("gao").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("source").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});
