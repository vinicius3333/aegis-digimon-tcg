import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-015.js";

describe("BT8 Silphymon DNA control deck gauntlet", () => {
  it("updates UI candidates after DP reduction, deletes a different target, then uses the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-011", as: "redMaterial" },
            { card: "ST10-04", as: "yellowMaterial" },
          ],
          hand: [
            { card: "BT8-015", as: "silphymon" },
            { card: "ST3-10", as: "magnadramon" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "reducedTarget", dp: 9000 },
            { card: "BT1-010", as: "dnaDeleteTarget", dp: 5000 },
            { card: "BT1-011", as: "attackDeleteTarget", dp: 5000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoOrderTriggers: true },
    );
    const reducedTargetId = s.perm("reducedTarget").permanentId;
    const dnaDeleteTargetId = s.perm("dnaDeleteTarget").permanentId;
    const attackDeleteTargetId = s.perm("attackDeleteTarget").permanentId;
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [
          s.perm("redMaterial").permanentId,
          s.perm("yellowMaterial").permanentId,
        ],
        instanceId: s.inst("silphymon").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const dpChoice = s.state.pendingDecision!;
    const dpRequest = s.decisions.find(({ req }) => req.decisionId === dpChoice.decisionId)?.req;
    expect(new Set(dpRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([reducedTargetId, dnaDeleteTargetId, attackDeleteTargetId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dpChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [reducedTargetId] },
      }),
    ).toEqual({ ok: true });

    await settle(() =>
      s.state.pendingDecision?.kind === "chooseTargets" &&
      s.state.pendingDecision.decisionId !== dpChoice.decisionId
    );
    const deleteChoice = s.state.pendingDecision!;
    const deleteRequest = s.decisions.find(({ req }) => req.decisionId === deleteChoice.decisionId)?.req;
    expect(new Set(deleteRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([reducedTargetId, dnaDeleteTargetId, attackDeleteTargetId]),
    );
    expect(s.perm("reducedTarget").currentDP).toBe(4000);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deleteChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [dnaDeleteTargetId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === dnaDeleteTargetId) &&
      s.state.pendingDecision === undefined
    );

    const silphymon = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("silphymon").instanceId,
    );
    expect(silphymon).toBeDefined();
    expect(silphymon!.isSuspended).toBe(false);
    expect(silphymon!.stack).toHaveLength(2);
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: silphymon!.permanentId,
        instanceId: s.inst("magnadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => silphymon!.topCard?.instanceId === s.inst("magnadramon").instanceId);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: silphymon!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const attackChoice = s.state.pendingDecision!;
    const attackRequest = s.decisions.find(({ req }) => req.decisionId === attackChoice.decisionId)?.req;
    expect(new Set(attackRequest?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([reducedTargetId, attackDeleteTargetId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [attackDeleteTargetId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === attackDeleteTargetId) &&
      !observe(s.engine).isAttacking()
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([reducedTargetId]);
    assertNoLoudGap(s);
  });
});
