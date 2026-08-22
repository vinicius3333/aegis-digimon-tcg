import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-046.js";
import "./BT5-057.js";

describe("BT5-057 Rosemon", () => {
  it("Digi-Bursts 3 to give all own Digi-Burst Digimon Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-057", as: "rose", under: ["BT1-009", "BT1-010", "BT1-011"] }, { card: "BT5-046", as: "ally" }, { card: "BT1-009", as: "nonBurst" }] } }, { autoSelectCards: true });
    const source = (s.engine as any).cardSourceOf(s.perm("rose").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-057/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("rose").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("rose"), "SecurityAttack") === 1 && observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack") === 1);

    expect(s.perm("rose").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("rose"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("nonBurst"), "SecurityAttack")).toBe(0);
  });
});
