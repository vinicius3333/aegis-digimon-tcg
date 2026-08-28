import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-012.js";

describe("BT3-012 Aquilamon", () => {
  it("selects exactly one opposing Digimon with 2000 DP or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-015", as: "host", under: ["BT3-012"] }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "eligible" },
          { card: "BT1-011", as: "otherEligible" },
          { card: "BT1-010", as: "tooLarge", dp: 2001 },
        ],
        security: ["BT1-011"],
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
      expect.arrayContaining([s.perm("eligible").permanentId, s.perm("otherEligible").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(2);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("tooLarge").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("eligible").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2, 5000);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("otherEligible").permanentId)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooLarge").permanentId)).toBe(true);
  });
});
