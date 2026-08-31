import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-029 GulusGammamon", () => {
  it("deletes itself, accepts the equal-DP boundary, rejects a higher-DP target, and revives Gammamon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-029", as: "gulus" }], trash: [{ card: "RB1-005", as: "gammamon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lower" },
            { card: "BT1-019", as: "equal" },
            { card: "BT1-021", as: "higher" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const gammamonInstanceId = s.inst("gammamon").instanceId;
    const gulusInstanceId = s.inst("gulus").instanceId;
    const equalPermanentId = s.perm("equal").permanentId;
    const higherPermanentId = s.perm("higher").permanentId;
    preferred.push(equalPermanentId, gammamonInstanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gulus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === gammamonInstanceId));

    const deletionDecision = s.decisions.find(
      ({ req }) => req.sourceCardId === "RB1-029" && req.kind === "chooseTargets",
    )?.req;
    expect(deletionDecision?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("lower").permanentId, equalPermanentId]),
    );
    expect(deletionDecision?.options?.candidateInstanceIds).not.toContain(higherPermanentId);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === gammamonInstanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === gammamonInstanceId)?.isSuspended,
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === equalPermanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === higherPermanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gulusInstanceId)).toBe(true);
  });
});
