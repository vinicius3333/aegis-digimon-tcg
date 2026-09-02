import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-046.js";
import "./BT5-056.js";

describe("BT5-056 Rafflesimon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-056")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("Digi-Bursts 2 to boost own Digimon and restrict an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-056", as: "raffle", under: ["BT5-051", "BT5-052"] },
            { card: "BT5-047", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "BT4-073", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    const before = s.perm("ally").currentDP;
    const raffleBefore = s.perm("raffle").currentDP;
    const source = internalsOf(s.engine).cardSourceOf(s.perm("raffle").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT5-056/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("raffle").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("ally").currentDP === before + 2000 &&
        observe(s.engine).isRestricted(s.perm("opponent"), "attack") &&
        observe(s.engine).isRestricted(s.perm("opponent"), "block"),
    );

    expect(s.perm("raffle").stack).toHaveLength(0);
    expect(s.perm("ally").currentDP).toBe(before + 2000);
    expect(s.perm("raffle").currentDP).toBe(raffleBefore + 2000);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(true);
  });

  it("reacts to another own Digi-Burst once, then expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          battleArea: [
            { card: "BT5-056", as: "raffle", under: ["BT5-051", "BT5-052"] },
            { card: "BT5-046", as: "terrier", under: ["BT5-004"] },
          ],
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009"), battleArea: [{ card: "BT4-073", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const terrierSource = internalsOf(s.engine).cardSourceOf(s.perm("terrier").topCard!);
    const terrierEffectKey = effectsOf(EffectTiming.OnDeclaration, terrierSource).find((effect) =>
      effect.effectKey.startsWith("BT5-046/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terrier").topCard!.instanceId,
        effectKey: terrierEffectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("terrier").stack.length === 0 &&
        observe(s.engine).isRestricted(s.perm("opponent"), "attack") &&
        s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(true);
    const raffleAfterTerrierBurst = s.perm("raffle").currentDP;

    const restrictionDecisions = () =>
      s.decisions.filter(
        ({ req }) =>
          req.kind === "chooseTargets" && req.options?.candidateInstanceIds?.includes(s.perm("opponent").permanentId),
      );
    const restrictionCount = restrictionDecisions().length;
    const raffleSource = internalsOf(s.engine).cardSourceOf(s.perm("raffle").topCard!);
    const raffleEffectKey = effectsOf(EffectTiming.OnDeclaration, raffleSource).find((effect) =>
      effect.effectKey.startsWith("BT5-056/"),
    )!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("raffle").topCard!.instanceId,
        effectKey: raffleEffectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("raffle").stack.length === 0 && s.state.pendingDecision === undefined);

    expect(s.perm("raffle").currentDP).toBe(raffleAfterTerrierBurst + 2000);
    expect(restrictionDecisions()).toHaveLength(restrictionCount);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(true);

    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(false);
  });

  it("does not react when the Digi-Burst host belongs to the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-056", as: "raffle", under: ["BT5-051", "BT5-052"] }] },
      1: {
        battleArea: [
          { card: "BT5-046", as: "opponentBurst", under: ["BT5-004"] },
          { card: "BT4-073", as: "opponent" },
        ],
      },
    });
    await s.ready();
    const discardedIds = s.perm("opponentBurst").stack.map(({ instanceId }) => instanceId);
    // No legal player intent can activate the opponent's Main effect during seat 0's turn;
    // fire the same production event bus with the opponent's real stacked host and cards.
    await advance(s.engine).fireSubTrigger("onDigiBurstCardDiscarded", {
      subjectPermanentId: s.perm("opponentBurst").permanentId,
      trashedDigivolutionInstanceIds: discardedIds,
      isDigiBurstTrash: true,
    });

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(false);
    expect(s.perm("opponentBurst").stack).toHaveLength(1);
  });
});
