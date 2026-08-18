import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-004.js";
import "./BT5-046.js";

describe("BT5-004 Yokomon", () => {
  it("gives an own Digimon +2000 DP after being trashed for Digi-Burst", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-046", as: "host", under: [{ card: "BT5-004", as: "yokomon" }] }], deck: ["BT5-044"] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const host = s.perm("host");
    const before = host.currentDP;
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-046/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("host").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => host.currentDP === before + 2000);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("yokomon").instanceId)).toBe(true);
    expect(host.currentDP).toBe(before + 2000);
  });
});
