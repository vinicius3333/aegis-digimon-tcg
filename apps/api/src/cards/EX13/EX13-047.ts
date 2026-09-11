import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-047 Gotsumon (Digimon, Black, Lv.3 Rookie [Rock], Data, play cost 3, DP 3000).
// The catalog carries one EvoCost (Black Lv.2 for 0) and the card prints no [Digivolve]
// header, so no `digivolutionRequirement` entry is needed.
//
// Printed clauses:
//   ＜Blocker＞
//   [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Royal Knight] trait
//     and 1 card with ＜Blocker＞ among them to the hand. Return the rest to the bottom of
//     the deck.
//   [When Attacking] Lose 2 memory.
//   [Inherited] [Opponent's Turn] This Digimon gets +2000 DP.
// No security effect is printed.
//
// No KB rulings exist for this card (EX13 is pre-release). General rules consulted:
//   - §16-36 ＜Blocker＞: read straight off the printed text by `combat/keywords.ts`; the
//     `Static` entry keeps the IR record complete (the EX13-020 / EX13-028 shape).
//   - §4-22-1 cards "with XX in their texts": a card "with ＜Blocker＞" is one printing that
//     icon anywhere in its own printed information. The official manual §1 spells the zones
//     out — names, traits, effects, INHERITED effects, Link/Rule/requirement lines — which is
//     exactly the union `match: "text"` reads. `isPrintedKeywordToken` additionally anchors
//     the token to its ＜＞ delimiters, so ＜Material Save＞-style substring collisions and a
//     card merely NAMED with the word cannot qualify (`keywordToken.ts`).
//   - §4-23 traits: "with the [Royal Knight] trait" is the EXACT reading, `match: "trait"`,
//     as on EX13-020/EX13-026. `traitContains` would wrongly admit [Royal Base].
//
// The reveal is the EX5-017 / EX13-009 two-slot layout: one 3-card reveal with two `add`
// specs, because the printed sentence is "1 A and 1 B", not KB Q2625's "1 A or 1 B" union.
// The interpreter's `taken` set (`actions/reveal.ts`) already stops the second slot reusing
// the first slot's card, which is what makes a single [Royal Knight] ＜Blocker＞ Digimon fill
// one slot only. Neither slot carries a `kind`, because the printed wording is "1 card".
//
// [When Attacking] is unconditional here — unlike ST16-05's conditional twin it has no "during
// your turn" or "attacks a Digimon" qualifier — so it is a bare `GainMemory` with a negative
// amount, the engine's "lose memory" spelling (`actions/resources.ts`).
//
// The inherited line is byte-identical to EX5-017's and BT23-018's, so it is encoded
// identically: `trigger: "OpponentsTurn"`, `isInherited: true`, a self-targeted `ModifyDP` of
// +2000 with `duration: "permanent"` — the window itself, not the duration, scopes it to the
// opponent's turn.
const royalKnightCard: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
};

const blockerCard: Filter = {
  controllerDefault: "mine",
  nameOrTrait: [{ tokens: ["Blocker"], match: "text" }],
};

export const compiled: CompiledCard = {
  cardId: "EX13-047",
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: royalKnightCard, count: 1, to: "hand" },
            { filter: blockerCard, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
          raw: "Reveal the top 3 cards of your deck. Add 1 card with the [Royal Knight] trait and 1 card with ＜Blocker＞ among them to the hand. Return the rest to the bottom of the deck",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "GainMemory", amount: -2, raw: "Lose 2 memory" }],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
          raw: "This Digimon gets +2000 DP",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-047", compiled);
