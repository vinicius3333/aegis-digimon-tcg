import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-056.js";

describe("BT5-056 Rafflesimon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-056")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("Digi-Bursts 2 to boost own Digimon and restrict an opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-056", as: "raffle", under: ["BT1-009", "BT1-010"] }, { card: "BT5-047", as: "ally" }] }, 1: { battleArea: [{ card: "BT4-073", as: "opponent" }] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("ally").currentDP;
    const source = (s.engine as any).cardSourceOf(s.perm("raffle").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-056/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("raffle").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.perm("ally").currentDP === before + 2000 && observe(s.engine).isRestricted(s.perm("opponent"), "attack") && observe(s.engine).isRestricted(s.perm("opponent"), "block"));

    expect(s.perm("raffle").stack).toHaveLength(0);
    expect(s.perm("ally").currentDP).toBe(before + 2000);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(true);
  });
});
