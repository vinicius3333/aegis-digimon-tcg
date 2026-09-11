import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-038 Salamon (Digimon, Green, Lv.3 Rookie [Mammal], Vaccine, play cost 3, DP 2000).
// Single printed evoCost: Green Lv.2 for 0. No [Digivolve] header, so no
// `digivolutionRequirement` entry — the catalog route is the only route.
//
// Printed clauses:
//   [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Leopardmon] in its text and
//     1 Digimon card with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of
//     its traits among them to the hand. Return the rest to the bottom of the deck.
//   [Rule] Trait: Has [Beast] Type.
//   [Inherited] [All Turns] All of your suspended Digimon get +1000 DP.
// No security effect is printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §4-22-1 printed information: "in its text" is the token anywhere in the card's printed
//     information, which the engine models as `match: "text"` (name ∪ traits ∪ printed text).
//   - §2-3-2-4: "with [XX] in any of its traits" references "cards with one or more traits that
//     INCLUDE the text in brackets" — the substring reading, `match: "traitContains"`. §2-3-2-3
//     is the exact reading, and it is reserved for the other printed wording ("with the [XX]
//     trait").
//   - §3-4-5-3 breeding area: cards there can't be affected by effects that do not explicitly
//     reference the breeding area, which is the permanent-targeting default, so the inherited
//     Aura needs no `zone`.
//
// The [On Play] reveal is BT13-048's sentence (this card's earlier printing) crossed with
// EX13-009's two-slot layout: two `add` slots over one 3-card reveal, each slot taking one card
// per printed category rather than one card from a pooled union (the clause is "and", not "or").
//
// Slot 1 carries NO `kind`: the printed noun is "1 card", so a Tamer or an Option naming
// [Leopardmon] in its text qualifies just as a Digimon does (BT13-107 Vulcan Crusher is the
// live example). `match: "text"` is the §4-22-1 reading; `match: "name"` would wrongly reject it.
//
// Slot 2 is the BT23-012 trait shape, not BT13-048's auto-generated exact-trait one. "other than
// [Sea Animal]" only makes sense under substring matching — [Sea Animal] is never an exact
// [Animal] match, so an exact reading would make the printed exclusion dead text. So:
//   * [Beast] and [Sovereign] are substring tokens with no conflict ([Holy Beast],
//     [Four Sovereigns] qualify) and sit in their own branch;
//   * [Animal] is a substring token that DOES collide with [Sea Animal], so its branch carries
//     the card-level `excludeNameOrTrait` exclusion.
// Splitting the branches keeps the exclusion confined to the token that needs it: a Digimon
// carrying both [Sea Animal] and [Beast] still qualifies on [Beast], which is what the printed
// sentence says. Residual (shared with BT23-012): no primitive excludes one trait from a
// substring scan, so a card carrying BOTH [Sea Animal] and another [...Animal] spelling would be
// rejected on the [Animal] branch. No printed card has that pair.
//
// "Return the rest to the bottom of the deck" prints no "in any order", so `rest: "deckBottom"`
// (EX13-009), not `deckBottomAnyOrder` (BT13-048's differently worded printing).
//
// [Rule] Trait is the EX12-026 / ST18-12 / EX8-026 shape: a `Rule`-trigger `GrantStatic` with
// `grant: "trait"` on `isSelfRef`. The catalog prints only [Mammal], so this clause is the only
// source of [Beast] on this card. The entry is DECLARATIVE, not load-bearing: `staticTraitsOf`
// (`apps/api/src/engine/cards/cardData.ts:299`) already parses `[Rule] Trait: Has [X]` out of the
// printed `effectText` for every card, so [Beast] is live with or without it (mutation-confirmed:
// deleting this whole effect leaves the behavioural trait tests green). It is kept for the same
// reason the three peer cards keep theirs — the IR record of the printed clause stays complete.
//
// The inherited clause is BT16-101's continuous Aura shape with the seat flipped: a `suspended`
// board filter over `count: "all"`, so the set of recipients is re-evaluated as Digimon suspend
// and unsuspend. "your" is the host controller's seat, hence `controller: "mine"`; the host
// itself is included when it is suspended (no `excludeSelf` is printed).
const leopardmonTextCard: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Leopardmon"], match: "text" }],
};

const beastAnimalSovereignDigimon: Filter = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  or: [
    { nameOrTrait: [{ tokens: ["Beast", "Sovereign"], match: "traitContains" }] },
    {
      nameOrTrait: [{ tokens: ["Animal"], match: "traitContains" }],
      excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
    },
  ],
};

export const compiled: CompiledCard = {
  cardId: "EX13-038",
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: leopardmonTextCard, count: 1, to: "hand" },
            { filter: beastAnimalSovereignDigimon, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
          raw: "Reveal the top 3 cards of your deck. Add 1 card with [Leopardmon] in its text and 1 Digimon card with [Beast], [Animal] or [Sovereign], other than [Sea Animal], in any of its traits among them to the hand. Return the rest to the bottom of the deck.",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Beast"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], suspended: true },
            count: "all",
          },
          effect: { kind: "modifyDP", amount: 1000 },
          raw: "All of your suspended Digimon get +1000 DP",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-038", compiled);
