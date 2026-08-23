import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST1/ST1-16.js";
import "./EX1-052.js";
import "./EX1-053.js";

describe("EX1 Etemon cross-set control deck", () => {
  it("discounts its own evolution, scales from trash, and preserves duplicate stack identity through deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-052", as: "evolvingEtemon" },
          { card: "EX1-053", as: "otherMetalEtemon" },
        ],
        hand: [{ card: "EX1-053", as: "metalEtemon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        trash: ["EX1-052", "EX1-053"],
      },
      1: {
        battleArea: [
          { card: "BT1-015", as: "firstRedStack", under: ["BT1-009"] },
          { card: "BT1-015", as: "secondRedStack", under: ["BT1-009"] },
        ],
        hand: [{ card: "ST1-16", as: "gaiaForce" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("evolvingEtemon").permanentId,
        instanceId: s.inst("metalEtemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("evolvingEtemon").topCard.instanceId === s.inst("metalEtemon").instanceId &&
        s.state.memory === 8 &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.memory).toBe(8);
    expect(observe(s.engine).hasKeyword(s.perm("evolvingEtemon"), "Jamming")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolutionDraw").instanceId)).toBe(
      true,
    );
    // The visible top-card/memory state precedes the trailing continuous recompute by a
    // few microtasks. Flush that window before simulating the opponent taking the turn.
    await settle();

    const deletedPermanentId = s.perm("evolvingEtemon").permanentId;
    const survivingPermanentId = s.perm("otherMetalEtemon").permanentId;
    const firstRedPermanentId = s.perm("firstRedStack").permanentId;
    const secondRedPermanentId = s.perm("secondRedStack").permanentId;
    const secondRedTopId = s.perm("secondRedStack").topCard.instanceId;
    const gaiaForceId = s.inst("gaiaForce").instanceId;
    const priorDecisionCount = s.decisions.length;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("evolvingEtemon").currentDP).toBe(12_000);
    expect(observe(s.engine).hasKeyword(s.perm("evolvingEtemon"), "Jamming")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: gaiaForceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return s.decisions.length > priorDecisionCount && req?.sourceCardId === "ST1-16" && req.kind === "chooseTargets";
    });

    const deletionDecision = s.decisions.at(-1)!.req;
    expect(new Set(deletionDecision.options?.candidateInstanceIds)).toEqual(
      new Set([deletedPermanentId, survivingPermanentId]),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: deletionDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [deletedPermanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return (
        req?.decisionId !== deletionDecision.decisionId &&
        req?.sourceCardId === "EX1-053" &&
        req.kind === "chooseTargets"
      );
    });
    const deDigivolveDecision = s.decisions.at(-1)!.req;
    expect(new Set(deDigivolveDecision.options?.candidateInstanceIds)).toEqual(
      new Set([firstRedPermanentId, secondRedPermanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deDigivolveDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [secondRedPermanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === deletedPermanentId) &&
        s.perm("secondRedStack").topCard.cardId === "BT1-009" &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === secondRedTopId) &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === gaiaForceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === survivingPermanentId)).toBe(true);
    expect(s.perm("firstRedStack").topCard.cardId).toBe("BT1-015");
    expect(s.perm("secondRedStack").topCard.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(2);
    // The deleted EX1-052/053 stack joins the two starting Etemons in trash.
    expect(s.perm("otherMetalEtemon").currentDP).toBe(14_000);
    assertNoLoudGap(s);
  });
});
