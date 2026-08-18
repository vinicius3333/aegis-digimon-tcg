import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-064.js";
import "./BT4-068.js";

describe("BT4-064 Sunarizamon", () => {
  it("returns itself to hand after it is trashed for Digi-Burst", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-068", as: "baboon", under: ["BT1-001", { card: "BT4-064", as: "sunari" }] }] }, 1: { battleArea: [{ card: "BT4-066", as: "target", under: ["BT4-063"] }] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(s.perm("baboon").topCard!)).find((effect) => effect.effectKey.startsWith("BT4-068/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("baboon").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sunari").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sunari").instanceId)).toBe(true);
  });
});
