import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT18-026.js";

describe("BT18-026 DaiPenmon", () => {
  it("pays both named trash placements and 3 memory for its hand Main evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-026", as: "dai" }],
          trash: [
            { card: "BT18-022", as: "kumamon" },
            { card: "BT18-025", as: "korikakumon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tommy").topCard.instanceId, s.inst("kumamon").instanceId, s.inst("korikakumon").instanceId);
    s.state.memory = 5;
    await s.ready();
    const source = s.inst("dai");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source)).find((effect) =>
      effect.effectKey.startsWith("BT18-026/"),
    )!.effectKey;
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT18-022", "BT18-025", "BT18-089"]),
    );
  });

  it("cannot partially pay the hand Main cost when Korikakumon is absent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-089", as: "tommy" }],
          hand: [{ card: "BT18-026", as: "dai" }],
          trash: [{ card: "BT18-022", as: "kumamon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    await s.ready();
    const source = s.inst("dai");
    const effectKey = effectsOf(EffectTiming.OnDeclaration, (s.engine as any).cardSourceOf(source)).find((effect) =>
      effect.effectKey.startsWith("BT18-026/"),
    )!.effectKey;
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      {
        ok: false,
        reason: "illegal-target",
      },
    );

    expect(s.perm("tommy").topCard.cardId).toBe("BT18-089");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT18-022");
    expect(s.state.memory).toBe(5);
  });

  it("naturally deletes an opposing empty-stack Digimon after evolving from a Hybrid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-025", as: "hybrid" }],
          hand: [{ card: "BT18-026", as: "dai" }],
        },
        1: { battleArea: [{ card: "BT1-030", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hybrid").permanentId,
        instanceId: s.inst("dai").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(false);
  });

  it("digivolves from a blue/red level-4 Hybrid for 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-025", as: "hybrid" }],
        hand: [{ card: "BT18-026", as: "dai" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hybrid").permanentId,
        instanceId: s.inst("dai").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hybrid").topCard.cardId === "BT18-026");

    expect(s.state.memory).toBe(2);
    expect(s.perm("hybrid").stack.at(-1)?.cardId).toBe("BT18-025");
  });

  it("exposes Ice Clad, the Ice-Snow Rule trait, and inherited +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-026", as: "self" },
          { card: "BT1-030", dp: 3000, as: "host", under: ["BT18-026"] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("self"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("self"), "Ice-Snow")).toBe(true);
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
