import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Self-register every compiled-IR card module so the LM options + filler resolve.
import "../index.js";

// A3 for the "X Memory Boost!" reveal-add family primary effect:
//   "[Main] Reveal the top 3 cards of your deck. Add 1 [color-pair] Digimon among them to the
//    hand. Return the rest to the bottom of the deck."
// The runtime record now emits a faithful RevealAdd (revealCount 3, add 1 of the color pair to hand,
// rest deckBottom); this proves it end-to-end: the matching Digimon lands in hand and the two
// non-matching cards go to the deck (bottom).
//
// SCOPE: this covers ONLY the reveal-add primary. The co-resident <Delay> "gain 2 memory" payload
// is a KNOWN separate bug — the runtime IR compiles it as an immediate [Main] effect, so it fires
// on play (the controller gains 2 memory the same turn) instead of being a later-turn activatable
// "by trashing this card" ability. Fixing that needs a <Delay>-activation subsystem (delay-zone
// placement exists; activation does not) + a runtime record change, tracked as separate work.
//
// FAILS-WHEN-REVERTED: a RevealAdd that mis-filters (wrong color) or routes the rest elsewhere
// turns the per-card hand/deck assertions RED.

// Single-color effect-free Digimon used as deck fodder.
const RED = "BT1-009";
const YELLOW = "BT1-045";
const GREEN = "BT1-064";
const BLUE = "BT1-027";
const PURPLE = "BT10-079";
const BLACK = "BT10-022"; // no pure mono-Black vanilla exists; this one carries Black among its colors

// cardId -> { match (a Digimon of one color in the add pair), non1/non2 (colors outside the pair) }
const TABLE: Record<string, { match: string; non1: string; non2: string }> = {
  "LM-033": { match: RED, non1: YELLOW, non2: GREEN }, // red or black
  "LM-034": { match: BLUE, non1: YELLOW, non2: GREEN }, // blue or red
  "LM-035": { match: YELLOW, non1: RED, non2: GREEN }, // yellow or purple
  "LM-036": { match: GREEN, non1: RED, non2: YELLOW }, // green or blue
  "LM-037": { match: YELLOW, non1: RED, non2: GREEN }, // black or yellow
  "LM-038": { match: PURPLE, non1: RED, non2: YELLOW }, // purple or green
  "LM-045": { match: RED, non1: GREEN, non2: BLUE }, // red or yellow
  "LM-046": { match: BLUE, non1: RED, non2: YELLOW }, // blue or purple
  "LM-047": { match: YELLOW, non1: RED, non2: BLUE }, // yellow or green
  "LM-048": { match: GREEN, non1: RED, non2: YELLOW }, // green or black
  "LM-049": { match: BLUE, non1: RED, non2: YELLOW }, // black or blue
  "LM-050": { match: RED, non1: YELLOW, non2: GREEN }, // purple or red
  "LM-051": { match: RED, non1: YELLOW, non2: BLUE }, // red or green
  "LM-052": { match: BLUE, non1: RED, non2: GREEN }, // blue or yellow
  "LM-053": { match: PURPLE, non1: RED, non2: YELLOW }, // black or purple
};

// Each card's OWN printed color (§4-21-2 requirement) — distinct from `match` above, which is
// whichever color of the printed "X or Y" pair the reveal-add filter is being exercised with.
// Several of these cards ALSO accept an alternate color via their own printed "color
// requirements also met by <color>" text, but that alternate-acceptance clause is a separate,
// per-card divergence (not `optionColorRequirements`, not in this fix's scope) — the source
// seated below is always the card's unconditional own color.
const PRINTED_COLOR: Record<string, string> = {
  "LM-033": RED,
  "LM-034": BLUE,
  "LM-035": YELLOW,
  "LM-036": GREEN,
  "LM-037": BLACK,
  "LM-038": PURPLE,
  "LM-045": RED,
  "LM-046": BLUE,
  "LM-047": YELLOW,
  "LM-048": GREEN,
  "LM-049": BLACK,
  "LM-050": PURPLE,
  "LM-051": RED,
  "LM-052": BLUE,
  "LM-053": BLACK,
};

describe("reveal-add family — Memory Boost! primary (reveal 3, add 1 of the color pair, rest to deck)", () => {
  for (const [cardId, { match, non1, non2 }] of Object.entries(TABLE)) {
    it(`${cardId}: adds the matching Digimon to hand and returns the rest to the deck`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: PRINTED_COLOR[cardId]!, dp: 3000 }], // §4-21 color-requirement source
            hand: [{ card: cardId, as: "option", faceUp: true }],
            // Deck top 3 = exactly [match, non1, non2] so reveal-3 reveals all and the choice is forced.
            deck: [{ card: match }, { card: non1 }, { card: non2 }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const p0 = s.state.players[0] as PlayerState;
      s.state.memory = 3; // exactly the play cost

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => p0.hand.some((c) => c.cardId === match));

      // The matching-color Digimon was added to hand; the two non-matching cards went back to the
      // deck; the matching card is no longer in the deck.
      expect(p0.hand.some((c) => c.cardId === match)).toBe(true);
      expect(p0.deck.filter((c) => c.cardId === non1).length).toBe(1);
      expect(p0.deck.filter((c) => c.cardId === non2).length).toBe(1);
      expect(p0.deck.some((c) => c.cardId === match)).toBe(false);
    });
  }
});
