import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-075 Mon (Tamer, White, play cost 4, no evoCosts, no inherited text).
//
// Printed text:
//   [Start of Your Turn] If you have 2 or less memory, set it to 3.
//   [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Huckmon] in its text
//     among them to the hand. Return the rest to the bottom of the deck.
//   [Security] Play this card without paying the cost.
//
// Rules notes (no card-specific KB entries — EX13 is pre-release; `node tools/kb/query.mjs
// card EX13-075` reports "no knowledge-base entries"):
//   - comprehensive §6-2-1: the [Start of Your Turn] memory floor is processed BEFORE the
//     unsuspend processing of the unsuspend phase; the rule's own worked example is this
//     exact sentence. §4-1-3: "If you have X or less memory" reads the gauge on the
//     controller's side. Both give the plain `memoryAtMost` condition on a `SetMemory` —
//     the accepted shape on sibling EX13-068 (byte-identical printed clause) and BT26-096.
//     `SetMemory` sets, never adds, so a gauge already at 3+ is untouched by the action
//     itself as well as by the condition.
//   - comprehensive §4-23-1: "with [Huckmon] in its text" is the token anywhere in the
//     information printed on the card, which the engine models as `match: "text"` (the
//     name ∪ traits ∪ every printed text field union). `match: "name"` would wrongly drop
//     cards such as BT6-093 Judgement of the Blade, which names [Huckmon] only inside its
//     effect text; §4-23-3 confirms such a card is referenced even when that effect can
//     never trigger from where it sits. Peer encodings of the identical printed phrase:
//     EX13-046 ("[Mamemon] in its text"), EX13-014 and EX13-061 ("w/[Huckmon] in text").
//   - The slot prints "1 card", not "1 Digimon card", so the filter carries no `kind` —
//     EX13-008's single-slot shape. The sentence prints no "you may", so the add is
//     mandatory, and `rest: "deckBottom"` is the printed "Return the rest to the bottom of
//     the deck". A single `add` slot needs no `requiresMinRevealed` (it is inert whenever
//     every slot has `count: 1`).
//   - [Security] is the standard self-play: a `Security` effect flagged `isSecurity` with
//     one `PlayWithoutCost` at `isSelfRef`/`isSelf`, `payCost: false` (EX13-068's shape).
//     Playing it this way fires the [On Play] reveal above, which is correct — the card
//     genuinely enters play.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-075", compiled);
