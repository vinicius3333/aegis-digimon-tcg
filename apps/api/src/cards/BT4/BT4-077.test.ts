import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-068.js";
import "./BT4-077.js";

describe("BT4-077 Ghostmon", () => {
  it("returns to hand after being trashed for its host's Digi-Burst", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-068", as: "host", under: ["BT4-077", "BT1-009"] }] }, 1: { battleArea: [{ card: "BT4-066", as: "target", under: ["BT4-063"] }] } }, { autoSelectCards: true });
    await s.engine.recomputeContinuousEffects();
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT4-068/"))!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.perm("host").topCard!.instanceId, effectKey })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT4-077"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-077")).toBe(true);
  });
});
