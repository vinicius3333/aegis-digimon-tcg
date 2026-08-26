import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-054.js";

describe("BT4-054 Sunflowmon", () => {
  it("Digi-Bursts 2 to stop a suspended opposing Digimon from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-054", as: "sun", under: ["BT1-001", "BT4-052"] }] },
        1: { battleArea: [{ card: "BT1-019", suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("sun").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-054/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sun").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));

    expect(s.perm("sun").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("does not restrict an unsuspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT4-054", as: "sun", under: ["BT1-001", "BT4-052"] }] },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("sun").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-054/"))!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("sun").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sun").stack.length === 2, 5000);

    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });
});
