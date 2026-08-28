import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-005.js";
import "./P-054.js";

describe("Yellow recovery promo deck gauntlet", () => {
  it("chains Patamon on-play, Seraphimon digivolution, security battle, and on-deletion recovery", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-015", as: "levelFiveBase" },
          { card: "BT1-089", as: "tamer" },
        ],
        hand: [
          { card: "P-005", as: "patamon" },
          { card: "P-054", as: "seraphimon" },
        ],
        deck: [
          { card: "BT1-009", as: "patamonRecovery" },
          { card: "BT1-010", as: "digivolutionDraw" },
          { card: "BT1-011", as: "digivolutionRecovery" },
          { card: "BT1-012", as: "deletionRecovery" },
        ],
        security: [{ card: "BT1-028", as: "originalSecurity" }],
      },
      1: { security: [{ card: "ST4-13", as: "securityMega" }] },
    });
    s.state.memory = 10;
    const baseInstanceId = s.perm("levelFiveBase").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("patamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.instanceId === s.inst("patamonRecovery").instanceId, 1000);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("levelFiveBase").permanentId,
        instanceId: s.inst("seraphimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.instanceId === s.inst("digivolutionRecovery").instanceId, 1500);

    const seraphimon = s.perm("levelFiveBase");
    expect(seraphimon.topCard.instanceId).toBe(s.inst("seraphimon").instanceId);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("digivolutionDraw").instanceId }),
    );
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: seraphimon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === seraphimon.permanentId) &&
        s.state.players[0]!.security[0]?.instanceId === s.inst("deletionRecovery").instanceId,
      3000,
    );

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("seraphimon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === baseInstanceId)).toBe(true);
  });
});
