import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-052.js";
import "./BT4-059.js";

describe("BT4-052 Lalamon", () => {
  it("returns itself to hand after it is trashed for Digi-Burst", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT4-059",
              as: "lila",
              under: ["BT4-004", { card: "BT4-052", as: "lala" }, "BT4-054"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009" }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("lila"))).find(
      (effect) => effect.effectKey.startsWith("BT4-059/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lila").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lala").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("lala").instanceId)).toBe(true);
    expect(s.perm("lila").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
  });
});

describe("BT4-052 Lalamon — KB Q&A rulings", () => {
  it("returns to hand only after the Digi-Burst effect has resolved (Q1212)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT4-059",
              as: "lila",
              under: ["BT4-004", { card: "BT4-052", as: "lala" }, "BT4-054"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const effectKey = effectsOf(EffectTiming.OnDeclaration, observe(s.engine).cardSource(s.perm("lila"))).find(
      (effect) => effect.effectKey.startsWith("BT4-059/"),
    )!.effectKey;
    const lalamonIn = (zone: "hand" | "trash") =>
      s.state.players[0]![zone].some((card) => card.instanceId === s.inst("lala").instanceId);
    const snapshots: { event: string; lalamonInHand: boolean; lalamonInTrash: boolean; targetSuspended: boolean }[] =
      [];

    await observe(s.engine).captureSubTriggers(
      async () => {
        expect(
          s.engine.applyIntent(0, {
            type: "activateEffect",
            sourceInstanceId: s.perm("lila").topCard!.instanceId,
            effectKey,
          }),
        ).toEqual({ ok: true });
        await settle(() => lalamonIn("hand") && s.perm("target").isSuspended);
      },
      (event) =>
        snapshots.push({
          event,
          lalamonInHand: lalamonIn("hand"),
          lalamonInTrash: lalamonIn("trash"),
          targetSuspended: s.perm("target").isSuspended,
        }),
    );

    const digiBurstSuspend = snapshots.find((snapshot) => snapshot.event === "whenSuspended");
    expect(digiBurstSuspend).toMatchObject({ targetSuspended: true, lalamonInTrash: true, lalamonInHand: false });
    expect(lalamonIn("hand")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
