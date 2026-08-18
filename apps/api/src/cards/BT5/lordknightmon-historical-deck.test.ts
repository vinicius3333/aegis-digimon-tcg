import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-042.js";
import "./BT5-045.js";

describe("BT5 LordKnightmon historical deck", () => {
  it("plays Knightmon while attacking, deletes through DP reduction, and grows with the wider board", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-045", as: "lordKnightmon" }],
          hand: [{ card: "BT5-042", as: "knightmon" }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "reductionTarget", dp: 4000 }],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    const targetId = s.perm("reductionTarget").permanentId;
    const targetInstanceId = s.perm("reductionTarget").topCard.instanceId;
    const lordBaseDP = s.perm("lordKnightmon").baseDP;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("lordKnightmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) =>
        permanent.topCard.instanceId === s.inst("knightmon").instanceId
      ) &&
      !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId) &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );
    await settle();
    await s.engine.recomputeContinuousEffects();

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("lordKnightmon").currentDP).toBe(lordBaseDP + 1000);
    expect(s.state.players[1]!.trash.some((card) =>
      card.instanceId === targetInstanceId
    )).toBe(true);
    assertNoLoudGap(s);
  });
});
