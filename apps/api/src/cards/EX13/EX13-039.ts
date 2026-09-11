import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-039 Coredramon (Digimon, Green/Red, Lv.4 Champion [Dragon], Virus, play cost 5, 5000 DP,
// printed EvoCosts Green Lv.3 for 3 and Red Lv.3 for 3).
//
// Printed main text:
//   [Digivolve] Lv.3 w/[Dracomon] in name: Cost 2
//   [On Play] [When Digivolving] You may return 1 non-Digi-Egg card with [Dracomon] or [Examon]
//     in its text from your trash to the hand.
//   [Your Turn] When any of your other Digimon with [Dracomon] or [Examon] in their texts are
//     played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the
//     hand with the cost reduced by 2.
// Printed inherited text:
//   [Your Turn] This Digimon gets +2000 DP.
// No printed security text.
//
// KB: `node tools/kb/query.mjs card EX13-039` reports no entries — EX13 is pre-release, so no
// card-specific rulings exist yet. General rules consulted in `data/kb/rules/comprehensive.md`:
//   - §4-22-1: a "card with XX in its text" is a card carrying the term anywhere in the
//     information PRINTED on it. The official rule manual §1 spells out the member fields: name,
//     traits, effects, inherited effects, Link, Rule, digivolution requirements and DigiXros
//     requirements. The engine models exactly that union as `match: "text"`.
//   - §4-23-2: a Digimon does not GAIN its digivolution cards' text, only their effects — see the
//     `printedTextOnly` note on the watcher below for why that is behaviourally moot here.
//
// This card is the Green/Red sibling of EX13-018 Coredramon (Blue/Red): the alternate [Digivolve]
// header, the [Your Turn] digivolve watcher and the inherited +2000 DP are printed word for word
// the same, so those three clauses are EX13-018's accepted IR verbatim. Only the
// [On Play]/[When Digivolving] body differs — EX13-018 draws 2 by trashing a hand card, this card
// returns a trash card to hand. BT20-040 Coredramon is the same card's earlier Green/Red printing
// and carries the same alternate header; its watcher is narrower (blue Digimon only, into
// [Groundramon] by name), so only the header is shared IR.

// "[On Play] [When Digivolving] You may return 1 non-Digi-Egg card with [Dracomon] or [Examon] in
// its text from your trash to the hand."
//
// `zone: "trash"` + `controller: "mine"` is the loose-card pool ("from your trash"), and
// `to: "hand"` the destination. `excludeKind: ["DigiEgg"]` is the printed "non-Digi-Egg" gate —
// the same shape EX5-018/EX10-074 use for that exact wording. It is load-bearing rather than
// decorative: BT20-002 Bebydomon is a Digi-Egg whose inherited line prints
// "[Dracomon]/[Examon]" and would otherwise be a legal return.
//
// "with [Dracomon] or [Examon] in its text" is §4-22-1, so `match: "text"` (name ∪ traits ∪ every
// printed text field) rather than `match: "name"` — the narrower reading would drop exactly the
// cards this clause exists to recover, such as BT20-040 Coredramon, which only mentions the two
// tokens inside an effect body. Both tokens live in ONE `nameOrTrait` entry because entries are
// OR-matched, which keeps the printed "or" an OR instead of an accidental conjunction.
//
// The clause says "card", not "Digimon card", so the filter carries no `kind` — a Tamer or Option
// with either token in its text is a legal return.
//
// "You may" is the clause's only optionality and it gates the whole (costless) return, so
// `optional: true` with no `cost` and no `abortOnDecline` — there is nothing after it to abort.
const returnTokenCardFromTrash: Action = {
  kind: "Return",
  target: {
    filter: {
      zone: "trash",
      controller: "mine",
      excludeKind: ["DigiEgg"],
      nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
    },
    count: 1,
  },
  to: "hand",
  optional: true,
  raw: "You may return 1 non-Digi-Egg card with [Dracomon] or [Examon] in its text from your trash to the hand",
};

const compiled: CompiledCard = {
  effects: [
    // Two printed timings, no printed [Once Per Turn], so each window is its own effect entry with
    // no `frequency` and no `sharedUseKey`: a card that is played and later digivolved into gets
    // one activation per window (EX13-018/EX13-021's accepted shape for the same header pair).
    { trigger: "OnPlay", actions: [returnTokenCardFromTrash] },
    { trigger: "WhenDigivolving", actions: [returnTokenCardFromTrash] },
    {
      // "[Your Turn] When any of your other Digimon with [Dracomon] or [Examon] in their texts are
      // played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the
      // hand with the cost reduced by 2."
      //
      // `trigger: "YourTurn"` stamps the watcher's `turnScope`, which is what makes the clause inert
      // on the opponent's turn; `sourceFilter.controller: "mine"` independently rules out a Digimon
      // the OPPONENT plays. `excludeSelf: true` is the printed "other": this card's own arrival must
      // not arm its own watcher, while a sibling copy already on the board sees that same arrival as
      // "other" and may digivolve.
      //
      // The `Digivolve` payload targets the carrier (`isSelfRef` + `isSelf`) — "this Digimon" — and
      // pulls the new top out of `from: ["hand"]`. `payCost: true` keeps the memory cost real and
      // `reduceCost: 2` is the printed reduction folded into the digivolve verb (never a separate
      // `wouldDigivolve` replacement, which could not reach this action's own digivolve).
      // `optional: true` carries "may".
      //
      // The destination half names only [Examon], not the pair, so a [Dracomon]-only hand card is
      // NOT a legal top. `kind: ["Digimon"]` is printed ("a Digimon card").
      //
      // No `printedTextOnly: true` on either filter, matching EX13-018. The flag narrows a live
      // `match: "text"` ref to a permanent's own printed information (§4-23-2; EX13-021/EX13-024),
      // but it is behaviourally inert in both places here: a `whenPlayed` subject has just entered
      // the battle area by PLAY, so its digivolution stack is empty, and the `into` pool is loose
      // hand cards, which have no stack at all.
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Examon"], match: "text" }],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
            },
          ],
          raw: "When any of your other Digimon with [Dracomon] or [Examon] in their texts are played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the hand with the cost reduced by 2",
        },
      ],
    },
    {
      // Inherited "[Your Turn] This Digimon gets +2000 DP": a `ModifyDP` on the host
      // (`isSelfRef` resolves to the permanent carrying this card) with `duration: "permanent"`
      // under a `YourTurn` window, which is what scopes it to the controller's own turn.
      // EX13-011/EX13-018 print the identical line and compile it the same way.
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  // "[Digivolve] Lv.3 w/[Dracomon] in name: Cost 2" reads "in name", so it is the SUBSTRING name
  // gate `names`, not `namesExact` and not the wider `texts`: every Lv.3 whose printed NAME
  // contains "Dracomon" qualifies at 2 (ST1-04, BT20-007, ST8-03, BT21-046 "Dracomon (X
  // Antibody)"), while a Lv.3 that only mentions [Dracomon] inside an effect does not. The header
  // carries no color, so it is strictly WIDER than the two catalog EvoCosts on that axis — a Blue
  // Lv.3 Dracomon reaches this Green/Red card for 2, which neither printed EvoCost allows.
  digivolutionRequirement: [{ level: 3, names: ["Dracomon"], cost: 2, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-039", compiled);
