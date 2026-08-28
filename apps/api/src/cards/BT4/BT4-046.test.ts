import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-046.js";

describe("BT4-046 WarGrowlmon", () => {
  it("Digi-Bursts 2 to give an opposing Digimon -4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-046", as: "war", under: ["BT1-001", "BT4-039"] },
            { card: "BT4-043", as: "ally", under: [{ card: "BT1-001", as: "allySource" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("war").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT4-046/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("war").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === s.perm("target").baseDP - 4000);

    expect(s.perm("war").stack).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP - 4000);
    expect(s.perm("ally").stack).toHaveLength(1);
    expect(s.perm("ally").stack[0]!.instanceId).toBe(s.inst("allySource").instanceId);
  });

  it("gives +1000 DP to its host at 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-047", as: "host", under: ["BT4-046"] }],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give its host DP at 4 security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-047", as: "host", under: ["BT4-046"] }],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
