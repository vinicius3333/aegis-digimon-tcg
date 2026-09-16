import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-049 Dorumon (Black/Yellow Lv.3 Rookie, Data, [Beast]/[X Antibody]/[Chronicle],
// play cost 3, DP 1000, printed EvoCosts Black Lv.2 for 1 and Yellow Lv.2 for 1).
//
// Printed clauses:
//   [Digivolve] [Dorimon]/Black Lv.2 w/[X Antibody] trait: Cost 0
//   [When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with the
//     [X Antibody] or [Chronicle] trait among them to the hand. Return the rest to the top or
//     bottom of the deck.
//   Inherited: [When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP for
//     the turn.
// No security effect is printed.
//
// KB: `node tools/kb/query.mjs card EX13-049` reports no card-specific KB entries in the current
// local index (EX13 is pre-release). General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-22-1 card information: "w/[X] trait" reads Form ∪ Attribute ∪ Type by EXACT equality,
//     which is `match: "trait"` rather than a substring containment.
//   - §7-1 Digivolving / §2-3-9 alternate digivolution requirements: a printed [Digivolve] header
//     is ADDITIVE to the catalog EvoCosts, so this card keeps its two colored Lv.2-for-1 routes
//     and gains the cheaper header route on top of them.
//
// The header "[Dorimon]/Black Lv.2 w/[X Antibody] trait" is ONE printed cost line covering TWO
// independent source descriptions separated by "/", so it compiles to TWO
// `digivolutionRequirement` entries at the same cost — the BT20-051 / BT20-053 shape for the
// identically punctuated headers on this card's own evolution line. Writing it as a single entry
// carrying both `namesExact` and the level/color/trait gate would AND them together and lock out
// the non-[Dorimon] Black Lv.2 [X Antibody] eggs the second half exists to admit.
//   - `namesExact: ["Dorimon"]` is the bracketed-name reading (EXACT printed name, so
//     "Dorimon X" or a longer name is refused).
//   - The second entry pins level 2 AND `colors: ["Black"]` AND `traits: ["X Antibody"]`: the
//     printed "Black Lv.2 w/[X Antibody] trait" is a conjunction of all three.
//
// The reveal is BT20-048's clause with one `add` slot instead of two: the printed sentence names
// a single card and a single trait union ("1 card with the [X Antibody] or [Chronicle] trait"),
// so the two tokens live in ONE `nameOrTrait` reference — `tokens` is an OR-list, while two
// separate references would read as a conjunction and demand a card carrying BOTH traits.
// No `kind` restriction: the printed subject is "1 card", not "1 Digimon card", so a [Chronicle]
// Tamer (BT20-087) or Option (P-204) is an equally legal pick.
//
// "Return the rest to the top or bottom of the deck" is `rest: "deckTopOrBottom"` — the printed
// player choice per remaining card, distinct from BT20-048's flat "bottom of the deck"
// (`deckBottom`). The sentence carries no "you may", so the add is mandatory when a candidate
// was revealed.
//
// One sentence printed under two timings is two effects sharing one action list, the
// EX13-026 / EX13-007 shape, not one effect with a compound trigger.
const X_ANTIBODY_OR_CHRONICLE: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["X Antibody", "Chronicle"], match: "trait" }],
};

const revealThreeAddOne = (): Action => ({
  kind: "RevealAdd",
  revealCount: 3,
  add: [{ filter: X_ANTIBODY_OR_CHRONICLE, count: 1, to: "hand" }],
  rest: "deckTopOrBottom",
  raw: "Reveal the top 3 cards of your deck. Add 1 card with the [X Antibody] or [Chronicle] trait among them to the hand. Return the rest to the top or bottom of the deck.",
});

export const compiled: CompiledCard = {
  cardId: "EX13-049",
  effects: [
    { trigger: "WhenMoving", actions: [revealThreeAddOne()] },
    { trigger: "OnPlay", actions: [revealThreeAddOne()] },
    // Inherited: a plain one-shot debuff on one opposing Digimon. "for the turn" is the
    // attacker's own turn boundary (`forTheTurn` = UntilEachTurnEnd), and the printed
    // [Once Per Turn] is the effect-level `frequency`, so a second attack in the same turn by a
    // host carrying this card cannot repeat it.
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "battleArea" }, count: 1 },
          amount: -2000,
          duration: "forTheTurn",
          raw: "1 of your opponent's Digimon gets -2000 DP for the turn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Dorimon"], cost: 0, isAlternate: true },
    { level: 2, colors: ["Black"], traits: ["X Antibody"], cost: 0, isAlternate: true },
  ],
};

registerIrCard("EX13-049", compiled);
