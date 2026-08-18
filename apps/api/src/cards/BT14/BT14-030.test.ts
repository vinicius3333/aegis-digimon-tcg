import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 behavioral test for BT14-030 (MarineAngemon):
//   [On Play] By returning 1 of your opponent's Lv.3 Digimon or 1 of your Digimon to hand,
//   return 1 of your opponent's Digimon whose level is <= the returned Digimon's level to hand.
//
// Observable: playing BT14-030, returning our own Lv.5 Digimon as cost, causes an opp Lv.5
// Digimon to also be returned to hand (level 5 <= 5).
//
// FAILS-WHEN-REVERTED: remove the resolve body → opp Digimon stays on battle area.

const MARINE_ANGEMON = "BT14-030";
const MY_DIGIMON = "BT5-087"; // Lv.5 Blue Digimon (Vikemon) — any Lv.5 is fine as cost
const OPP_DIGIMON = "BT5-087"; // same card for opp — Lv.5, within "level <= 5" threshold

describe("BT14-030 MarineAngemon [On Play] bounce", () => {
  it("returning own Digimon as cost bounces an opp Digimon of equal level to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MY_DIGIMON, dp: 5000, as: "myDigi" }],
          hand: [{ card: MARINE_ANGEMON, as: "card" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 5000, as: "oppDigi" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;

    s.state.memory = 10;

    const card = s.inst("card");

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    // Wait until opp Digimon leaves the battle area (bounced to hand).
    await settle(() => p1.battleArea.length === 0, 600);

    expect(p1.battleArea.length).toBe(0);
    expect(p1.hand.some((c) => c.cardId === OPP_DIGIMON)).toBe(true);
  });
});
