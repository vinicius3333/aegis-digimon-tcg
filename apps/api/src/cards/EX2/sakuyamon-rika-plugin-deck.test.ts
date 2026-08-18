import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-019.js";
import "./EX2-021.js";
import "./EX2-023.js";
import "./EX2-024.js";
import "./EX2-060.js";
import "./EX2-066.js";
import "./EX2-068.js";

describe("EX2 Sakuyamon Rika Plug-In deck gauntlet", () => {
  it("uses a chosen Plug-In for free and resolves every Renamon-line Option reaction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-024",
              as: "sakuyamon",
              under: ["EX2-019", "EX2-021", "EX2-023"],
            },
            { card: "EX2-060", as: "rika" },
          ],
          hand: [
            { card: "EX2-066", as: "offensivePlugIn" },
            { card: "EX2-068", as: "highSpeedPlugIn" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "combinedDpTarget", dp: 7000 },
            { card: "BT3-019", as: "bystander", dp: 12000 },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const offensivePlugInId = s.inst("offensivePlugIn").instanceId;
    const highSpeedPlugInId = s.inst("highSpeedPlugIn").instanceId;
    const dpTargetId = s.perm("combinedDpTarget").permanentId;
    const bystanderId = s.perm("bystander").permanentId;
    preferred.push(offensivePlugInId, s.perm("sakuyamon").permanentId, dpTargetId);
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("sakuyamon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === dpTargetId) &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 1,
      5000,
    );
    await settle();

    const plugInChoice = s.decisions.find(({ req }) =>
      req.kind === "selectCards" &&
      req.sourceCardId === "EX2-060" &&
      req.options?.candidateInstanceIds?.includes(offensivePlugInId)
    )?.req;
    expect(new Set(plugInChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([offensivePlugInId, highSpeedPlugInId]),
    );

    const reactionSources = new Set(
      s.decisions
        .filter(({ req }) =>
          req.kind === "chooseTargets" &&
          req.options?.candidateInstanceIds?.includes(dpTargetId)
        )
        .map(({ req }) => req.sourceCardId),
    );
    expect(reactionSources).toEqual(new Set(["EX2-021", "EX2-023", "EX2-024"]));

    expect(s.perm("rika").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("sakuyamon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === offensivePlugInId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === highSpeedPlugInId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      bystanderId,
    ]);
    expect(s.perm("bystander").currentDP).toBe(12000);
    assertNoLoudGap(s);
  });
});
