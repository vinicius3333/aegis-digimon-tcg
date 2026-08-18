import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-080.js";
import "./BT8-083.js";
import "./BT8-093.js";

describe("BT8 MaloMyotismon/Yukio end-turn deck", () => {
  it("turns a battle deletion into memory, then exposes exact trash and unsuspended target choices at end-turn timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-093", as: "yukio" },
            { card: "BT8-080", as: "myotismon", suspended: true },
          ],
          trash: [
            { card: "BT8-083", as: "firstMaloMyotismon" },
            { card: "BT8-083", as: "secondMaloMyotismon" },
            "BT8-080",
            "BT8-080",
            "BT8-080",
            "BT8-080",
            "BT8-080",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-084", as: "attacker" },
            { card: "BT1-010", as: "firstUnsuspendedTarget" },
            { card: "BT1-010", as: "secondUnsuspendedTarget" },
          ],
          security: [
            { card: "BT1-011", as: "securityTop" },
            { card: "BT1-012", as: "securityBottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const myotismonPermanentId = s.perm("myotismon").permanentId;
    const myotismonInstanceId = s.perm("myotismon").topCard.instanceId;
    const yukioPermanentId = s.perm("yukio").permanentId;
    const yukioInstanceId = s.perm("yukio").topCard.instanceId;
    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "permanent", permanentId: myotismonPermanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === myotismonPermanentId) &&
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === myotismonInstanceId) &&
      s.perm("yukio").isSuspended &&
      s.state.memory === 2 &&
      s.events.some(({ kind }) => kind === "combatResolved"),
    );
    await settle();

    const firstMaloId = s.inst("firstMaloMyotismon").instanceId;
    const secondMaloId = s.inst("secondMaloMyotismon").instanceId;
    const priorDecisionCount = s.decisions.length;
    const endTurnFlow = advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("yukio"));
    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return s.decisions.length > priorDecisionCount &&
        req?.sourceCardId === "BT8-093" &&
        req.kind === "selectCards";
    });

    const trashChoice = s.decisions.at(-1)!.req;
    expect(new Set(trashChoice.options?.candidateInstanceIds)).toEqual(
      new Set([firstMaloId, secondMaloId]),
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: trashChoice.decisionId,
      response: { kind: "selectCards", instanceIds: [secondMaloId] },
    })).toEqual({ ok: true });

    await settle(() => {
      const req = s.decisions.at(-1)?.req;
      return req?.decisionId !== trashChoice.decisionId &&
        req?.sourceCardId === "BT8-083" &&
        req.kind === "chooseTargets";
    });
    const deletionChoice = s.decisions.at(-1)!.req;
    const firstTargetId = s.perm("firstUnsuspendedTarget").permanentId;
    const secondTargetId = s.perm("secondUnsuspendedTarget").permanentId;
    expect(new Set(deletionChoice.options?.candidateInstanceIds)).toEqual(
      new Set([firstTargetId, secondTargetId]),
    );
    expect(deletionChoice.options?.candidateInstanceIds).not.toContain(
      s.perm("attacker").permanentId,
    );
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: deletionChoice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [secondTargetId] },
    })).toEqual({ ok: true });
    await endTurnFlow;

    const securityTopId = s.inst("securityTop").instanceId;
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === secondMaloId) &&
      !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === yukioPermanentId) &&
      !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId) &&
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === securityTopId) &&
      s.state.players[1]!.security.length === 1 &&
      s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === firstMaloId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === yukioInstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(
      ({ permanentId }) => permanentId === s.perm("attacker").permanentId,
    )).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });
});
