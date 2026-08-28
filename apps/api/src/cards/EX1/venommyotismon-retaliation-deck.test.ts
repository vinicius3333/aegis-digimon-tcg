import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-056.js";
import "./EX1-057.js";
import "./EX1-061.js";
import "./EX1-063.js";

describe("EX1 VenomMyotismon Retaliation deck gauntlet", () => {
  it("plays a chosen Retaliation body, grants Rush, and attacks an unsuspended level 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-063",
              as: "venomMyotismon",
              under: ["EX1-057", "EX1-061"],
            },
          ],
          trash: [
            { card: "EX1-056", as: "demiDevimon" },
            { card: "EX1-057", as: "wizardmon" },
            { card: "EX1-058", as: "nonRetaliation" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "unsuspendedLevelFour" },
            { card: "BT6-077", as: "unsuspendedLevelFive" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    const demiDevimonId = s.inst("demiDevimon").instanceId;
    const wizardmonId = s.inst("wizardmon").instanceId;
    const levelFourId = s.perm("unsuspendedLevelFour").permanentId;
    const levelFiveId = s.perm("unsuspendedLevelFive").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venomMyotismon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const revivalChoice = s.decisions.at(-1)!.req;
    expect(revivalChoice.sourceCardId).toBe("EX1-063");
    expect(new Set(revivalChoice.options?.candidateInstanceIds ?? [])).toEqual(new Set([demiDevimonId, wizardmonId]));
    expect(revivalChoice.options?.candidateInstanceIds).not.toContain(s.inst("nonRetaliation").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: revivalChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [demiDevimonId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === demiDevimonId) &&
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.security.length === 1,
    );
    await settle();

    const revived = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === demiDevimonId)!;
    expect(observe(s.engine).hasKeyword(revived, "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(revived, "Rush")).toBe(true);
    expect(observe(s.engine).canAttackUnsuspended(revived)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: revived.permanentId,
        target: { kind: "permanent", permanentId: levelFiveId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: revived.permanentId,
        target: { kind: "permanent", permanentId: levelFourId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === revived.permanentId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === levelFourId) &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([levelFiveId]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === demiDevimonId)).toBe(true);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-013")).toBe(true);
    assertNoLoudGap(s);
  });
});
