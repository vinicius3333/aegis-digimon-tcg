import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-072.js";

describe("BT4-072 Gogmamon", () => {
  it("Digi-Bursts 1 to give an own Digimon +2000 DP through the opponent's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT4-072", as: "gog", under: ["BT1-009"] }] } },
      { autoSelectCards: true },
    );
    const gog = s.perm("gog");
    const before = gog.currentDP;
    const source = (s.engine as any).cardSourceOf(gog.topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT4-072/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gog").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => gog.currentDP === before + 2000);

    expect(s.perm("gog").stack).toHaveLength(0);
    expect(gog.currentDP).toBe(before + 2000);
  });

  it("gives its host +1000 DP as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-073", as: "host", under: ["BT4-072"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
