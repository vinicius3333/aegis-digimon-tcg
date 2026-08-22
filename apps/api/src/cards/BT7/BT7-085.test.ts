import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-085.js";

describe("BT7-085 Takuya Kanbara", () => {
  it("places exactly 5 Hybrid cards from trash and digivolves into EmperorGreymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT7-016", as: "emperor" }],
          trash: ["BT7-011", "BT7-011", "BT7-011", "BT7-011", "BT7-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("takuya").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)
      .find((effect) => effect.effectKey === "BT7-085/main-digivolve")!.effectKey;
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("takuya").topCard!.instanceId,
      effectKey,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("takuya").topCard?.instanceId === s.inst("emperor").instanceId &&
      observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack") === 1,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("takuya").stack).toHaveLength(6);
    expect(s.perm("takuya").currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack")).toBe(1);
  });

  it("may decline EmperorGreymon after ordering and placing all five Hybrid cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT7-016", as: "emperor" }],
          trash: [
            { card: "BT7-011", as: "hybridOne" },
            { card: "BT7-011", as: "hybridTwo" },
            { card: "BT7-011", as: "hybridThree" },
            { card: "BT7-011", as: "hybridFour" },
            { card: "BT7-011", as: "hybridFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );
    const source = (s.engine as any).cardSourceOf(s.perm("takuya").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source)
      .find((effect) => effect.effectKey === "BT7-085/main-digivolve")!.effectKey;
    const hybrids = ["hybridOne", "hybridTwo", "hybridThree", "hybridFour", "hybridFive"]
      .map((alias) => s.inst(alias).instanceId);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("takuya").topCard.instanceId,
      effectKey,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const materials = s.decisions.at(-1)!.req;
    expect(materials.sourceCardId).toBe("BT7-085");
    expect(materials.options?.timing).toBe("Main");
    expect(materials.options?.effectText).toContain("[Main][Once Per Turn]");
    expect(materials.options?.effectText).not.toContain("[Inherited]");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: materials.decisionId,
      response: { kind: "selectCards", instanceIds: hybrids },
    })).toMatchObject({ ok: false, reason: "decision-pending" });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.options?.orderDestination).toBe("stackBottom");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: hybrids },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("takuya").stack.length === 5);

    expect(s.perm("takuya").topCard.cardId).toBe("BT7-085");
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual(hybrids);
    expect(s.state.memory).toBe(4);
  });

  it("gives its host +2000 DP and Security Attack +1 at 10000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-014", under: ["BT7-085"], as: "host", dp: 8000 }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(10000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("removes the inherited DP and Security Attack bonuses on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-014", under: ["BT7-085"], as: "host", dp: 8000 }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(8000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
