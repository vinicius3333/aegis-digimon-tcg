import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST1/ST1-16.js";
import "./BT5-112.js";

describe("BT5 Omnimon Zwart Defeat Mastemon control deck", () => {
  it("selects a duplicate Tamer on evolution, then a duplicate Digimon after Gaia Force deletes the full stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST10-06", as: "mastemon" }],
        hand: [{ card: "BT5-112", as: "zwartDefeat" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT7-085", as: "firstTamer" },
          { card: "BT7-085", as: "secondTamer" },
          { card: "BT1-010", as: "firstDigimon" },
          { card: "BT1-010", as: "secondDigimon" },
        ],
        hand: [{ card: "ST1-16", as: "gaiaForce" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    const firstTamerId = s.perm("firstTamer").permanentId;
    const secondTamerId = s.perm("secondTamer").permanentId;
    const firstDigimonId = s.perm("firstDigimon").permanentId;
    const secondDigimonId = s.perm("secondDigimon").permanentId;
    const secondTamerCardId = s.perm("secondTamer").topCard.instanceId;
    const secondDigimonCardId = s.perm("secondDigimon").topCard.instanceId;
    const initialDecisionCount = s.decisions.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mastemon").permanentId,
        instanceId: s.inst("zwartDefeat").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return (
        s.decisions.length > initialDecisionCount && req?.sourceCardId === "BT5-112" && req.kind === "chooseTargets"
      );
    });

    const tamerDecision = s.decisions.at(-1)!.req;
    expect(new Set(tamerDecision.options?.candidateInstanceIds)).toEqual(new Set([firstTamerId, secondTamerId]));
    expect(tamerDecision.options?.candidateInstanceIds).not.toContain(s.perm("firstTamer").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: tamerDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [secondTamerId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTamerId) &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === secondTamerCardId) &&
        s.state.memory === 7 &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    const zwartPermanentId = s.perm("mastemon").permanentId;
    const zwartCardId = s.perm("mastemon").topCard.instanceId;
    const mastemonCardId = s.perm("mastemon").stack[0]!.instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    const decisionCountBeforeGaia = s.decisions.length;
    expect(
      s.engine.applyIntent(1, {
        type: "playCard",
        instanceId: s.inst("gaiaForce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return (
        s.decisions.length > decisionCountBeforeGaia && req?.sourceCardId === "BT5-112" && req.kind === "chooseTargets"
      );
    });

    const digimonDecision = s.decisions.at(-1)!.req;
    expect(new Set(digimonDecision.options?.candidateInstanceIds)).toEqual(new Set([firstDigimonId, secondDigimonId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digimonDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [secondDigimonId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === zwartPermanentId) &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === zwartCardId) &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === mastemonCardId) &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === secondDigimonCardId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTamerId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstDigimonId)).toBe(true);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });
});
