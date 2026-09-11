import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-048 Kotemon (Black, Lv.3 Rookie [Reptile], Data, play cost 3, DP 2000).
// One printed EvoCost: Black Lv.2 cost 0. The card prints no [Digivolve] header, so there is
// no `digivolutionRequirement` entry (contrast EX13-026, whose header adds an extra route).
//
// [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Knightmon] in its text and
// 1 card with [Knightmon] in its name among them to the hand. Return the rest to the bottom
// of the deck.
//   A single `RevealAdd` with `revealCount: 3` and TWO add slots, both `to: "hand"` — the
//   EX13-027 / EX13-026 shape, but with two DIFFERENT filters rather than one filter reused.
//
//   "with [Knightmon] in its text" is comprehensive §4-22-1 — the token anywhere in the card's
//   printed information (name ∪ traits ∪ effects ∪ inherited ∪ rule/requirement lines), which
//   the engine models as `match: "text"` (the EX13-008 / EX13-018 / EX13-039 reading).
//   "with [Knightmon] in its name" is the narrower §4-22 name reading, SUBSTRING over the name
//   field only, i.e. `match: "name"` (EX13-027 / EX13-028 shape): SkullKnightmon and
//   LordKnightmon qualify, a BT18-058 Kotemon that merely prints "[Knightmon]" in its effect
//   text does not. Every name match is necessarily also a text match, so the text slot is
//   strictly the wider of the two.
//
//   Slot order follows the printed order: text slot first, then name slot. Because the wider
//   slot resolves first it CAN consume the only [Knightmon]-named card, leaving the name slot
//   empty; the engine offers the whole matching set as a `selectCards` decision, so that is the
//   controller's choice rather than a coded outcome.
//
//   No `requiresMinRevealed` guard here, deliberately. That field counts matches of its OWN
//   slot filter over the full revealed set (`reveal.ts:253`), so a `2` on the name slot would
//   wrongly skip it in the common "one text-only card + one named card" reveal, where the
//   printed sentence adds both. The unguarded shape already produces the printed outcome: a
//   card taken by the first slot is in `taken` and cannot be taken twice.
//
//   The sentence carries no "you may", so both slots are mandatory — no `optional` / `upTo`.
//   `rest: "deckBottom"` is the printed "Return the rest to the bottom of the deck".
//
// [Inherited] [All Turns] [Once Per Turn] When this Digimon would leave the battle area other
// than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it
// doesn't leave.
//   A `wouldLeavePlay` Replacement in `mode: "prevent"` with `sourceFilter: { isSelfRef: true }`
//   and `leaveCause: "otherThanYourEffect"` — the EX11-022 / EX13-015 / EX13-027 encoding. The
//   cost is the engine's generic `deleteOwn` "delete as a cost" primitive.
//
//   The clause says "1 of YOUR other Digimon", so the cost target is `controller: "mine"` —
//   the deliberate contrast with EX13-027's bare "1 other Digimon" (`controller: "any"`,
//   matching BT11-040 / BT13-065). `excludeSelf: true` is the printed "other".
//
//   `match: "text"` here reads the whole candidate permanent, digivolution cards included,
//   which is the §4-23 / KB Q3208 default and correct for this clause. No `printedTextOnly`:
//   that flag exists for a HOST-identity gate whose own printed line prints the very tokens it
//   filters by (EX13-021 / EX13-024), and this filter never looks at the host — `isSelfRef`
//   carries the host identity and `excludeSelf` keeps the host out of the cost pool.
//
//   The printed [Once Per Turn] is the effect's `frequency`; no `oncePerTurnKey` (redundant per
//   the EX13-027 mutation finding).
const knightmonInText: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
};

const knightmonInName: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Knightmon"], match: "name" }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: knightmonInText, count: 1, to: "hand" },
            { filter: knightmonInName, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
              },
              count: 1,
            },
            raw: "by deleting 1 of your other Digimon with [Knightmon] in its text",
          },
          raw: "When this Digimon would leave the battle area other than by your effects, by deleting 1 of your other Digimon with [Knightmon] in its text, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-048", compiled);
