import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-046.js";
import "./BT5-050.js";

describe("BT5-050 Weedmon", () => {
  it("gains 1 memory after being trashed for its host's Digi-Burst", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-046", as: "host", under: [{ card: "BT5-050", as: "weed" }] }], deck: ["BT5-047"] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-046/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("host").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
