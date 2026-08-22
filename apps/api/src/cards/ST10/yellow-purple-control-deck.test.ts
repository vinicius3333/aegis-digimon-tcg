import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT5/BT5-112.js";
import "../BT9/BT9-112.js";
import "../ST7/ST7-10.js";
import "./ST10-06.js";

describe("Yellow/Purple control SEC package", () => {
  it("plays Zwart Defeat from security without battling and finishes the remaining check", async () => {
    const s = setupEngine({
      0: {
        security: [
          { card: "BT5-112", as: "zwartDefeat" },
          { card: "BT1-001", as: "remainingSecurity" },
        ],
      },
      1: {
        battleArea: [{ card: "ST7-10", as: "attacker" }],
      },
    });
    s.state.turnSeat = 1;
    const attackerId = s.perm("attacker").permanentId;
    const zwartId = s.inst("zwartDefeat").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 0 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === zwartId) &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("uses DeathXmon beside Mastemon to collapse a stacked board for 11 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST10-06", as: "mastemon" }],
        hand: [{ card: "BT9-112", as: "deathXmon" }],
      },
      1: {
        battleArea: [
          { card: "ST10-05", as: "deletedAfterDedigivolve", under: ["ST10-04"] },
          { card: "ST10-06", as: "survivesAfterDedigivolve", under: ["ST10-05"] },
          { card: "BT7-085", as: "opponentTamer" },
        ],
      },
    });
    s.state.memory = 11;
    const deletedId = s.perm("deletedAfterDedigivolve").permanentId;
    const survivorId = s.perm("survivesAfterDedigivolve").permanentId;
    const tamerId = s.perm("opponentTamer").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("deathXmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 0 &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === deletedId),
      5000,
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === survivorId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === tamerId)).toBe(true);
    expect(s.perm("survivesAfterDedigivolve").topCard.cardId).toBe("ST10-05");
  });

  it("deletes every opposing Digimon tied for lowest play cost at opponent turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-112", as: "deathXmon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowestOne" },
          { card: "BT1-009", as: "lowestTwo" },
          { card: "ST10-05", as: "higherCost" },
        ],
      },
    });
    s.state.turnSeat = 1;
    const higherCostId = s.perm("higherCost").permanentId;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("deathXmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(higherCostId);
  });
});
