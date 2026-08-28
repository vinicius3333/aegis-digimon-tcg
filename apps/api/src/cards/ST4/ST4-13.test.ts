import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST4-13.js";

describe("ST4-13 HerculesKabuterimon", () => {
  it("has Piercing and Digi-Bursts 2 to suspend an opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-13", under: ["ST4-03", "ST4-08"], as: "hercules" }] },
        1: { battleArea: [{ card: "ST4-08", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("hercules"))).toBe(true);
    const source = (s.engine as any).cardSourceOf(s.perm("hercules").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("ST4-13/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("hercules").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("hercules").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
