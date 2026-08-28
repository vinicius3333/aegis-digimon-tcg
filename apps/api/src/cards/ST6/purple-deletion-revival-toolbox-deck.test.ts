import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-04.js";
import "./ST6-08.js";
import "./ST6-14.js";
import "./ST6-15.js";
import "./ST6-16.js";

describe("ST6 purple deletion and revival toolbox deck", () => {
  it("keeps duplicate permanent choices distinct, gains Matt memory, and suppresses revived On Play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST6-14", as: "matt" },
            { card: "ST6-04", as: "firstDracmon" },
            { card: "ST6-04", as: "secondDracmon" },
          ],
          hand: [
            { card: "ST6-15", as: "deathClaw" },
            { card: "ST6-16", as: "nailBone" },
          ],
          trash: [{ card: "ST6-08", as: "devimonToRevive" }],
        },
        1: {
          battleArea: [
            { card: "ST6-08", as: "firstEnemy" },
            { card: "ST6-08", as: "secondEnemy" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstDracmonInstanceId = s.perm("firstDracmon").topCard.instanceId;
    const secondEnemyInstanceId = s.perm("secondEnemy").topCard.instanceId;
    const deathClawId = s.inst("deathClaw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("deathClaw").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.sourceCardId === "ST6-15" && req.kind === "chooseTargets";
    });

    const costDecision = s.decisions.at(-1)!.req;
    expect(new Set(costDecision.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("firstDracmon").permanentId, s.perm("secondDracmon").permanentId]),
    );
    expect(costDecision.options?.candidateInstanceIds).not.toContain(s.perm("firstDracmon").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("firstDracmon").permanentId],
        },
      }),
    ).toEqual({ ok: true });

    const afterCostDecisionCount = s.decisions.length;
    await settle(
      () =>
        s.decisions.length > afterCostDecisionCount &&
        s.decisions.at(-1)?.req.sourceCardId === "ST6-15" &&
        s.decisions.at(-1)?.req.kind === "chooseTargets",
    );
    const targetDecision = s.decisions.at(-1)!.req;
    expect(new Set(targetDecision.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("firstEnemy").permanentId, s.perm("secondEnemy").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("secondEnemy").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("matt").isSuspended &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === firstDracmonInstanceId) &&
        s.state.players[1]!.trash.some(({ instanceId }) => instanceId === secondEnemyInstanceId) &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === deathClawId),
    );

    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === deathClawId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("secondDracmon").permanentId),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("firstEnemy").permanentId),
    ).toBe(true);

    const nailDecisionStart = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("nailBone").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.decisions.length >= nailDecisionStart + 2 &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === firstDracmonInstanceId) &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.instanceId === s.inst("devimonToRevive").instanceId,
        ),
      2000,
    );

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === firstDracmonInstanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === deathClawId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === deathClawId)).toBe(false);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });
});
