import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-021.js";
import "./BT7-025.js";
import "./BT7-029.js";
import "./BT7-086.js";

describe("BT7 Blue Hybrid historical deck", () => {
  it("returns Beowolfmon to bounce a level 5, restands MagnaGarurumon, and attacks again only once", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT7-029",
              as: "magnaGarurumon",
              under: [
                { card: "BT7-086", as: "tommy" },
                { card: "BT7-021", as: "kumamon" },
                { card: "BT7-025", as: "beowolfmon" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-040", as: "matchingLevelFive", under: [{ card: "BT1-001", as: "trashedSource" }] },
            { card: "BT3-015", as: "secondLevelFive" },
          ],
          security: ["BT1-002", "BT1-003", "BT1-004"],
          deck: ["BT1-005"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.inst("beowolfmon").instanceId,
      s.perm("matchingLevelFive").permanentId,
      s.perm("magnaGarurumon").permanentId,
    );
    const matchingLevelFiveInstanceId = s.perm("matchingLevelFive").topCard.instanceId;
    const secondLevelFiveId = s.perm("secondLevelFive").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnaGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("beowolfmon").instanceId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === matchingLevelFiveInstanceId) &&
        !s.perm("magnaGarurumon").isSuspended,
    );
    await settle();

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("trashedSource").instanceId)).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnaGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondLevelFiveId)).toBe(true);
    expect(s.perm("magnaGarurumon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
