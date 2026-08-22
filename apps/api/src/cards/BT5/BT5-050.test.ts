import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-046.js";
import "./BT5-050.js";
import "./BT5-004.js";

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

  it("does not trigger when another Digimon's Digi-Burst trashes the card", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT5-046", as: "weedHost", under: [{ card: "BT5-050" }] },
      { card: "BT5-046", as: "otherHost", under: [{ card: "BT5-004" }] },
    ], deck: ["BT5-047"] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const source = (s.engine as any).cardSourceOf(s.perm("otherHost").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT5-046/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("otherHost").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length > 0);
    expect(s.state.memory).toBe(0);
  });
});
