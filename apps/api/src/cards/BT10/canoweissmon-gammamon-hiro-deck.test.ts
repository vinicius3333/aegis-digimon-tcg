import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT8/BT8-008.js";
import "../BT8/BT8-013.js";
import "../P/P-059.js";
import "../P/P-062.js";
import "./BT10-011.js";

describe("BT10 Canoweissmon Gammamon/Hiro deck gauntlet", () => {
  it("inherits Betel Blitz, layers Hiro and Canoweiss buffs, deletes, and makes three checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-013",
              as: "gammamonLine",
              under: ["BT8-008", "P-059"],
            },
            { card: "P-062", as: "hiro" },
          ],
          hand: [{ card: "BT10-011", as: "canoweissmon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "smallTarget", dp: 3000 }],
          security: ["BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = true;
    s.state.memory = 2;
    const smallTargetId = s.perm("smallTarget").permanentId;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("gammamonLine").permanentId,
      instanceId: s.inst("canoweissmon").instanceId,
      useAlternateCost: true,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("gammamonLine").topCard.cardId === "BT10-011" &&
      s.engine.hasAcceptedBlitzAttack(s.perm("gammamonLine").permanentId)
    );

    expect(s.engine.hasAcceptedBlitzAttack(s.perm("gammamonLine").permanentId)).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(s.perm("gammamonLine").currentDP).toBe(10_000);
    expect(mainPhase.isOpen).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gammamonLine").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !observe(s.engine).isAttacking() &&
      s.perm("hiro").isSuspended &&
      s.state.players[1]!.security.length === 0 &&
      !s.state.players[1]!.battleArea.some(
        ({ permanentId }) => permanentId === smallTargetId,
      )
    );

    // The two temporary +1 grants are both still observable at combat completion and are also
    // proved behaviorally by consuming all 3 security cards.
    expect(observe(s.engine).keywordAmount(s.perm("gammamonLine"), "SecurityAttack")).toBe(2);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    await turn;
    // They expire cleanly at the crossed-memory turn boundary.
    expect(s.perm("gammamonLine").currentDP).toBe(10_000);
    expect(observe(s.engine).keywordAmount(s.perm("gammamonLine"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });
});
