import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-041.js";

describe("BT2 ShineGreymon yellow Tamer deck gauntlet", () => {
  it("presents three separate UI target choices while suspended Tamers distribute -4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-038", as: "rizegreymon" },
            { card: "BT1-087", as: "tkOne" },
            { card: "BT2-087", as: "kari" },
            { card: "BT1-087", as: "tkTwo" },
          ],
          hand: [{ card: "BT2-041", as: "shinegreymon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "singleHitTarget", dp: 4000 },
            { card: "BT2-047", as: "doubleHitTarget", dp: 8000 },
            { card: "BT3-019", as: "bystander", dp: 12000 },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    const singleHitTargetId = s.perm("singleHitTarget").permanentId;
    const doubleHitTargetId = s.perm("doubleHitTarget").permanentId;
    const bystanderId = s.perm("bystander").permanentId;
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rizegreymon").permanentId,
        instanceId: s.inst("shinegreymon").instanceId,
      }),
    ).toEqual({ ok: true });

    const expectedChoices = [singleHitTargetId, doubleHitTargetId, doubleHitTargetId];
    let previousDecisionId: string | undefined;
    for (const selectedId of expectedChoices) {
      await settle(
        () =>
          s.state.pendingDecision?.kind === "chooseTargets" &&
          s.state.pendingDecision.decisionId !== previousDecisionId,
      );
      const choice = s.state.pendingDecision!;
      expect(choice.kind).toBe("chooseTargets");
      const request = s.decisions.find(({ req }) => req.decisionId === choice.decisionId)?.req;
      expect(request?.sourceCardId).toBe("BT2-041");
      expect(new Set(request?.options?.candidateInstanceIds ?? [])).toEqual(
        new Set([singleHitTargetId, doubleHitTargetId, bystanderId]),
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: choice.decisionId,
          response: { kind: "chooseTargets", instanceIds: [selectedId] },
        }),
      ).toEqual({ ok: true });
      previousDecisionId = choice.decisionId;
    }

    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 1);

    expect(s.perm("tkOne").isSuspended).toBe(true);
    expect(s.perm("kari").isSuspended).toBe(true);
    expect(s.perm("tkTwo").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([bystanderId]);
    expect(s.perm("bystander").currentDP).toBe(12000);
    expect(s.perm("rizegreymon").topCard.instanceId).toBe(s.inst("shinegreymon").instanceId);
    expect(s.perm("rizegreymon").currentDP).toBe(14000);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
