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

describe("BT4-072 Gogmamon — KB Q&A rulings", () => {
  it("can choose [Gogmamon] itself as the Digimon that gets +2000 DP (Q1223)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-072", as: "gog", under: ["BT1-009"] },
            { card: "BT4-066", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    const gog = s.perm("gog");
    const ally = s.perm("ally");
    const gogBefore = gog.currentDP;
    const allyBefore = ally.currentDP;
    const source = (s.engine as any).cardSourceOf(gog.topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT4-072/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: gog.topCard!.instanceId, effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([gog.permanentId, ally.permanentId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [gog.permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => gog.currentDP === gogBefore + 2000);

    expect(gog.stack).toHaveLength(0);
    expect(gog.currentDP).toBe(gogBefore + 2000);
    expect(ally.currentDP).toBe(allyBefore);
  });
});
