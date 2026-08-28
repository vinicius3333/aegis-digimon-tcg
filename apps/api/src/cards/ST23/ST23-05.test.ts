import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import "../index.js";

// A3 for ST23-05 (Habakirimon) — the Recovery clause.
//
// "[When Digivolving]/[When Attacking][Once Per Turn] Place 1 of your opponent's lowest-DP Digimon
// as your top security card. Then, by trashing the top security card of 1 player with the most
// security cards, <Recovery +1>." (documented behavior.) The earlier model granted a permanent Recovery
// keyword (wrong); now it is the RecoverByTrashingMostSecurity IR action: an optional trash of an
// eligible player's top security followed by <Recovery +1> (top of deck -> top of security).
//
// FAILS-WHEN-REVERTED: neuter the recover step and the deck is short by only the standard digivolve
// draw (1), not draw + recovery (2).

const HABA = "ST23-05";
const BASE = "BT1-058"; // Chirinmon, Yellow Lv.5 (normal evo base for ST23-05)
const OPP_DIGIMON = "BT1-058"; // any Digimon; DP forced low so it is the opponent's lowest
const DECK_FILLER = "BT1-009";
const EVO_COST = 3;

describe("ST23-05 place-as-security + Recovery by trashing the most-security player's top", () => {
  it("digivolving places the opp lowest-DP Digimon in security, then trashes-and-recovers (+1 deck draw)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE, dp: 7000, as: "base" }],
          hand: [{ card: HABA, as: "haba" }],
          // p0 is the sole eligible "most security" player (p1 has none).
          security: [{ card: DECK_FILLER }],
          // Deck cards: 1 for the standard digivolve draw + 1 for <Recovery +1> + slack.
          deck: Array.from({ length: 5 }, () => DECK_FILLER),
        },
        // Opponent's only Digimon (=> the lowest-DP) — the placeAsSecurity target.
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 2000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const base = s.perm("base");
    const oppPerm = s.perm("oppPerm");
    const oppPermanentId = oppPerm.permanentId;
    const oppTopId = oppPerm.topCard!.instanceId;
    s.state.memory = EVO_COST;
    const deckBefore = p0.deck.length;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("haba").instanceId,
    });
    expect(res).toEqual({ ok: true });

    // Wait for the WHOLE [When Digivolving] chain (place-as-security THEN the optional
    // trash-and-recover) to finish — the recovery is the last step (deck -> security).
    await settle(() => deckBefore - p0.deck.length >= 2, 500);

    // Habakirimon landed.
    expect(base.topCard?.cardId).toBe(HABA);
    // placeAsSecurity: the opponent's Digimon left the field. Here p0 is the only most-security
    // player, so its top (the just-placed opp card) is what gets trashed for the Recovery — the opp
    // card lands in p0's trash, proving both the place and the trash-cost ran.
    expect(p1.battleArea.some((p) => p.permanentId === oppPermanentId)).toBe(false);
    expect(p0.trash.some((c) => c.instanceId === oppTopId)).toBe(true);
    // Recovery happened: deck shrank by 2 (standard digivolve draw + <Recovery +1>).
    expect(deckBefore - p0.deck.length).toBe(2);
  });

  it("trashes one security card to prevent all simultaneous Glowing Dawn leaves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HABA, as: "habakirimon" },
            { card: "ST23-02", as: "firstGlowingDawn" },
            { card: "ST23-03", as: "secondGlowingDawn" },
          ],
          security: [{ card: DECK_FILLER }, { card: DECK_FILLER }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const securityBefore = s.state.players[0]!.security.length;

    const deleted = await advance(s.engine).verb.deletePermanent([
      s.perm("firstGlowingDawn").permanentId,
      s.perm("secondGlowingDawn").permanentId,
    ]);

    expect(deleted).toBe(0);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
      expect.arrayContaining(["ST23-02", "ST23-03"]),
    );
    expect(s.state.players[0]!.security).toHaveLength(securityBefore - 1);
  });
});
