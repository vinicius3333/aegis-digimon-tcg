import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-086.js";
import "./BT3-087.js";
import "./BT3-092.js";

describe("BT3 MaloMyotismon historical deck gauntlet", () => {
  it("chains hand and trash summons, then stacks memory across a simultaneous battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-086", as: "arukenimon" },
            { card: "BT3-087", as: "mummymon" },
            { card: "BT1-010", as: "tieAttacker" },
          ],
          hand: [{ card: "BT3-092", as: "handMalo" }],
          trash: [{ card: "BT3-092", as: "trashMalo" }],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "tieDefender", suspended: true }],
          security: ["BT1-009", "BT1-011"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 7;
    const arukenimonId = s.perm("arukenimon").permanentId;
    const mummymonId = s.perm("mummymon").permanentId;
    const tieAttackerId = s.perm("tieAttacker").permanentId;
    const tieDefenderId = s.perm("tieDefender").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: arukenimonId,
        target: { kind: "permanent", permanentId: tieDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === arukenimonId) &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("handMalo").instanceId) &&
        s.state.memory === 5 &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    // Q1105: MaloMyotismon is already in play when Arukenimon deletes itself.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: mummymonId,
        target: { kind: "permanent", permanentId: tieDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === mummymonId) &&
        s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT3-092").length === 2 &&
        s.state.memory === 4 &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: tieAttackerId,
        target: { kind: "permanent", permanentId: tieDefenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === tieAttackerId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === tieDefenderId) &&
        s.state.memory === 8 &&
        !observe(s.engine).isAttacking(),
    );

    // Q1118/Q1120: two deletions grant 2 memory to each active MaloMyotismon.
    expect(s.state.memory).toBe(8);
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });
});
