import { EffectTiming, Zone, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-031.js";
import "./BT7-034.js";

describe("BT7-031 Herissmon", () => {
  it("returns itself to hand after being trashed for its host's Digi-Burst", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-034",
              under: ["BT1-005", { card: "BT7-031", as: "herissmon" }],
              as: "host",
            },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("herissmon").instanceId);
    const source = (s.engine as any).cardSourceOf(s.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-034/"),
    )!.effectKey;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("herissmon").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("herissmon").instanceId)).toBe(false);
    expect(s.perm("host").stack).toHaveLength(0);
  });
});

describe("BT7-031 Herissmon — KB Q&A rulings", () => {
  // Engine gap: the Digi-Burst cost trash fires onDigiBurstCardDiscarded watchers inline, so
  // Herissmon is back in hand before the ＜Security Attack -2＞ below the Digi-Burst resolves.
  it.fails("returns to hand only after the Digi-Burst effect has resolved (Q1551)", async () => {
    const preferred: string[] = [];
    const targetSecurityAttackWhenReturned: number[] = [];
    let s: EngineSetup | undefined;
    const recordReturn = (event: ServerEvent) => {
      if (s === undefined || event.kind !== "cardsMoved" || event.to !== Zone.Hand) return;
      if (!event.instanceIds.includes(s.inst("herissmon").instanceId)) return;
      targetSecurityAttackWhenReturned.push(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack"));
    };
    s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-034",
              under: ["BT1-005", { card: "BT7-031", as: "herissmon" }],
              as: "host",
            },
          ],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, onEvent: recordReturn },
    );
    const setup = s;
    preferred.push(setup.inst("herissmon").instanceId);
    const source = observe(setup.engine).cardSource(setup.perm("host").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT7-034/"),
    )!.effectKey;
    await setup.ready();

    expect(
      setup.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: setup.perm("host").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      setup.state.players[0]!.hand.some((card) => card.instanceId === setup.inst("herissmon").instanceId),
    );

    expect(observe(setup.engine).keywordAmount(setup.perm("target"), "SecurityAttack")).toBe(-2);
    expect(targetSecurityAttackWhenReturned).toEqual([-2]);
  });
});
