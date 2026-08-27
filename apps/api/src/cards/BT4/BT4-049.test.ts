import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-049.js";

describe("BT4-049 Varodurumon", () => {
  it("Digi-Bursts 3 to give all opposing Digimon -4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-049", as: "varo", under: ["BT1-001", "BT4-039", "BT4-046"] },
            { card: "BT4-043", as: "ally", under: [{ card: "BT1-001", as: "allySource" }] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-083", dp: 12000, as: "a" },
            { card: "BT4-060", dp: 12000, as: "b" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const effectKey = effectsOf(
      EffectTiming.OnDeclaration,
      (s.engine as any).cardSourceOf(s.perm("varo").topCard!),
    ).find((effect) => effect.effectKey.startsWith("BT4-049/"))!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("varo").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("a").currentDP === 8000 && s.perm("b").currentDP === 8000);

    expect(s.perm("varo").stack).toHaveLength(0);
    expect(s.perm("a").currentDP).toBe(8000);
    expect(s.perm("b").currentDP).toBe(8000);
    expect(s.perm("ally").stack).toHaveLength(1);
    expect(s.perm("ally").stack[0]!.instanceId).toBe(s.inst("allySource").instanceId);
  });
});
