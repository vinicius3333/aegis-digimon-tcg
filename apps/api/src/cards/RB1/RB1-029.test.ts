import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-029 GulusGammamon", () => {
  it("deletes itself at end of attack, deletes a lower-DP opponent, and plays exact Gammamon trash card suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-029", as: "gulus" }], trash: [{ card: "RB1-005", as: "gammamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const gammamonInstanceId = s.inst("gammamon").instanceId;
    const gulusInstanceId = s.inst("gulus").instanceId;
    preferred.push(gammamonInstanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gulus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === gammamonInstanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.instanceId === gammamonInstanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard.instanceId === gammamonInstanceId)?.isSuspended,
    ).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gammamonInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === gulusInstanceId)).toBe(true);
  });
});
