import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-001.js";

describe("BT3-001 Poromon", () => {
  it("inherited When Attacking deletes exactly one opposing Digimon with 1000 DP or less", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-016", as: "host", under: ["BT3-001"] },
          { card: "BT1-011", as: "ownLowDp" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-011", as: "first" },
          { card: "BT1-011", as: "second" },
          { card: "BT1-010", as: "tooLarge" },
        ],
        security: ["BT1-012"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;
    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("ownLowDp").permanentId);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("tooLarge").permanentId);

    const deletedInstanceId = s.perm("second").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deletedInstanceId), 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("first").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooLarge").permanentId)).toBe(true);
  });

  it("does nothing when the opponent has no Digimon with 1000 DP or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "host", under: ["BT3-001"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "target" }], security: ["BT1-012"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
