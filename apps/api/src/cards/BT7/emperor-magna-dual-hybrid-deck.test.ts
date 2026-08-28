import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-016.js";
import "./BT7-029.js";
import "./BT7-085.js";
import "./BT7-087.js";

describe("EmperorGreymon and MagnaGarurumon dual Hybrid deck", () => {
  it("orders ten mixed-zone Hybrids, evolves both Tamers, and combines inherited effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-085", as: "takuya" },
            { card: "BT7-087", as: "koji" },
            { card: "BT1-010", as: "returnedAlly" },
          ],
          hand: [
            { card: "BT7-016", as: "emperor" },
            { card: "BT7-021", as: "blueOne" },
            { card: "BT7-021", as: "blueTwo" },
            { card: "BT7-021", as: "blueThree" },
            { card: "BT7-021", as: "blueFour" },
            { card: "BT7-021", as: "blueFive" },
            { card: "BT7-029", as: "magna" },
          ],
          trash: [
            { card: "BT7-011", as: "redOne" },
            { card: "BT7-011", as: "redTwo" },
            { card: "BT7-011", as: "redThree" },
            { card: "BT7-011", as: "redFour" },
            { card: "BT7-011", as: "redFive" },
          ],
          deck: ["BT1-009", "BT1-012", "BT1-013"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: false,
      },
    );
    s.state.memory = 8;
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;
    const kojiInstanceId = s.perm("koji").topCard.instanceId;
    const returnedAllyInstanceId = s.perm("returnedAlly").topCard.instanceId;
    const takuyaSource = (s.engine as any).cardSourceOf(s.perm("takuya").topCard);
    const kojiSource = (s.engine as any).cardSourceOf(s.perm("koji").topCard);
    const takuyaEffect = effectsOf(EffectTiming.OnDeclaration, takuyaSource).find(
      (effect) => effect.effectKey === "BT7-085/main-digivolve",
    )!.effectKey;
    const kojiEffect = effectsOf(EffectTiming.OnDeclaration, kojiSource).find(
      (effect) => effect.effectKey === "BT7-087/main-digivolve",
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: takuyaInstanceId,
        effectKey: takuyaEffect,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const redOrdering = s.decisions.at(-1)!.req;
    const redOrder = (redOrdering.options?.candidateInstanceIds ?? []).slice().reverse();
    expect(redOrdering.options?.orderDestination).toBe("stackBottom");
    expect(redOrdering.options?.visibleCards).toHaveLength(5);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: redOrdering.decisionId,
        response: { kind: "orderCards", order: redOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard.instanceId === s.inst("emperor").instanceId &&
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-085"),
    );
    await s.engine.recomputeContinuousEffects();
    await settle(() => observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack") === 1);

    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toEqual([...redOrder, takuyaInstanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.perm("takuya").currentDP).toBeGreaterThanOrEqual(10_000);
    expect(observe(s.engine).keywordAmount(s.perm("takuya"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: kojiInstanceId,
        effectKey: kojiEffect,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const latest = s.decisions.at(-1)?.req;
      return (
        latest?.kind === "orderCards" &&
        latest.decisionId !== redOrdering.decisionId &&
        latest.decisionId === s.state.pendingDecision?.decisionId
      );
    });
    const blueOrdering = s.decisions.at(-1)!.req;
    const blueOrder = (blueOrdering.options?.candidateInstanceIds ?? []).slice().reverse();
    expect(blueOrdering.options?.visibleCards).toHaveLength(5);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: blueOrdering.decisionId,
        response: { kind: "orderCards", order: blueOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("koji").topCard.instanceId === s.inst("magna").instanceId &&
        s.state.pendingDecision === undefined &&
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT7-087"),
    );

    expect(s.perm("koji").stack.map((card) => card.instanceId)).toEqual([...blueOrder.slice(1), kojiInstanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === blueOrder[0])).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(true);

    await advance(s.engine).verb.returnToHand([s.perm("returnedAlly").topCard.instanceId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === returnedAllyInstanceId));

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("koji"), "cantBeBlocked")).toBe(true);
    assertNoLoudGap(s);
  });
});
