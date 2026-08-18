import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-065.js";
import "./BT8-068.js";

describe("BT8 Mamemon recycle swarm deck gauntlet", () => {
  it("recycles exact hand/trash copies, de-digivolves, then reveals and plays a Mamemon swarm", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-061", as: "levelFourBase" }],
          hand: [
            { card: "BT8-065", as: "catchMamemon" },
            { card: "BT8-068", as: "banchoMamemon" },
            { card: "BT6-064", as: "handMamemon" },
            { card: "BT6-064", as: "secondHandCopy" },
          ],
          trash: [
            { card: "BT3-071", as: "trashMetalMamemon" },
            { card: "BT6-063", as: "unchosenBigMamemon" },
          ],
          deck: [
            { card: "BT1-001", as: "catchEvolutionDraw" },
            { card: "BT1-002", as: "banchoRevealRest" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT8-067", as: "deDigivolveTarget", under: ["BT1-009", "BT1-015"] },
            { card: "BT1-010", as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: true },
    );
    const recycledIds = [
      s.inst("handMamemon").instanceId,
      s.inst("secondHandCopy").instanceId,
      s.inst("trashMetalMamemon").instanceId,
    ];
    const unchosenId = s.inst("unchosenBigMamemon").instanceId;
    const banchoMamemonId = s.inst("banchoMamemon").instanceId;
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("levelFourBase").permanentId,
      instanceId: s.inst("catchMamemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const recycleDecision = s.state.pendingDecision!;
    const recycleRequest = s.decisions.find(({ req }) => req.decisionId === recycleDecision.decisionId)?.req;
    expect(recycleRequest?.sourceCardId).toBe("BT8-065");
    expect(new Set(recycleRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([...recycledIds, unchosenId, banchoMamemonId]),
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: recycleDecision.decisionId,
      response: { kind: "selectCards", instanceIds: recycledIds },
    })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const deDigivolveDecision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: deDigivolveDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("deDigivolveTarget").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision === undefined &&
      s.perm("deDigivolveTarget").topCard.cardId === "BT1-015" &&
      recycledIds.every((instanceId) => s.state.players[0]!.deck.some((card) => card.instanceId === instanceId)),
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === unchosenId)).toBe(true);
    expect(new Set(s.state.players[0]!.deck.slice(0, 3).map(({ instanceId }) => instanceId))).toEqual(
      new Set(recycledIds),
    );

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("levelFourBase").permanentId,
      instanceId: s.inst("banchoMamemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => {
      const pending = s.state.pendingDecision;
      return pending?.kind === "selectCards" && pending.decisionId !== recycleDecision.decisionId;
    });

    const swarmDecision = s.state.pendingDecision!;
    const swarmRequest = s.decisions.find(({ req }) => req.decisionId === swarmDecision.decisionId)?.req;
    const swarmCandidateIds = swarmRequest?.options?.candidateInstanceIds ?? [];
    expect(swarmRequest?.sourceCardId).toBe("BT8-068");
    expect(swarmCandidateIds).toHaveLength(2);
    expect(swarmCandidateIds.every((instanceId) => recycledIds.includes(instanceId))).toBe(true);
    expect(recycledIds.filter((instanceId) =>
      s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)
    )).toHaveLength(1);
    expect(swarmRequest?.options?.max).toBe(2);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: swarmDecision.decisionId,
      response: { kind: "selectCards", instanceIds: swarmCandidateIds },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.pendingDecision === undefined &&
      swarmCandidateIds.every((instanceId) =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === instanceId)
      ) &&
      s.state.players[0]!.trash.some(({ instanceId }) =>
        instanceId === s.inst("banchoRevealRest").instanceId
      ) &&
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-068"),
      5000,
    );

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.some(({ instanceId }) =>
      instanceId === s.inst("catchEvolutionDraw").instanceId
    )).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) =>
      instanceId === s.inst("banchoRevealRest").instanceId
    )).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("levelFourBase"), "SecurityAttack")).toBe(1);
    assertNoLoudGap(s);
  });
});
