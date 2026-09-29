import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-034.js";
import "./BT7-003.js";

describe("BT7-003 Pusurimon", () => {
  it("gives an opposing Digimon -1000 DP when trashed for its host's Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-034", under: [{ card: "BT7-003", as: "pusurimon" }, "BT6-031"], as: "host" }],
        },
        1: { battleArea: [{ card: "BT6-016", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("pusurimon").instanceId);
    const source = observe(s.engine).cardSource(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-034/"),
    )!.effectKey;
    const baseDP = s.perm("target").baseDP;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === baseDP - 1000);

    expect(s.perm("target").currentDP).toBe(baseDP - 1000);
  });
});

describe("BT7-003 Pusurimon — KB Q&A rulings", () => {
  it.fails("resolves the host's <Digi-Burst> effect before its own trashed-by-Digi-Burst effect (Q1503)", async () => {
    const preferred: string[] = [];
    const targetStates: { dp: number; securityAttack: number }[] = [];
    let setup: ReturnType<typeof setupEngine> | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-034", under: [{ card: "BT7-003", as: "pusurimon" }, "BT6-031"], as: "host" }],
        },
        1: { battleArea: [{ card: "BT6-016", as: "target" }] },
      },
      {
        autoSelectCards: true,
        preferInstanceIds: preferred,
        // Snapshot the target at every event so the test sees which effect resolved first.
        onEvent: () => {
          if (setup === undefined) return;
          const target = setup.perm("target");
          targetStates.push({
            dp: target.currentDP,
            securityAttack: observe(setup.engine).keywordAmount(target, "SecurityAttack"),
          });
        },
      },
    );
    setup = s;
    preferred.push(s.inst("pusurimon").instanceId);
    const source = observe(s.engine).cardSource(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-034/"),
    )!.effectKey;
    const baseDP = s.perm("target").baseDP;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("target").currentDP === baseDP - 1000 &&
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -2,
    );

    expect(s.perm("target").currentDP).toBe(baseDP - 1000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    const firstPusurimonResult = targetStates.find((state) => state.dp === baseDP - 1000);
    expect(firstPusurimonResult?.securityAttack).toBe(-2);
  });
});
