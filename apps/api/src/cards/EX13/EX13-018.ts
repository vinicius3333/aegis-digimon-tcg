import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX13-018 Coredramon (Digimon, Blue/Red, Lv.4 Champion [Dragon], Vaccine, 5 cost, 5000 DP).
// Printed main text:
//   [Digivolve] Lv.3 w/[Dracomon] in name: Cost 2
//   [On Play] [When Digivolving] By trashing 1 card with [Dracomon] or [Examon] in its text
//     from your hand, ＜Draw 2＞
//   [Your Turn] When any of your other Digimon with [Dracomon] or [Examon] in their texts are
//     played, this Digimon may digivolve into a Digimon card with [Examon] in its text in the
//     hand with the cost reduced by 2.
// Printed inherited text:
//   [Your Turn] This Digimon gets +2000 DP.
//
// The alternate [Digivolve] header is a `digivolutionRequirement` entry, not an effect. It reads
// "in name", so it uses `names` — the SUBSTRING name gate — rather than `namesExact`/`texts`:
// Dracomon (EX13-017) and any other Lv.3 whose printed name contains "Dracomon" qualifies at
// cost 2, while a Lv.3 that only mentions [Dracomon] inside an effect does not. That is strictly
// narrower than EX13-011/EX13-012's `texts` gates and matches EX12-005's `names: ["Koromon"]`
// alternate. It is also colorless, so a non-Blue/non-Red Lv.3 Dracomon reaches this card, which
// the two catalog EvoCosts (Blue Lv.3 cost 3, Red Lv.3 cost 3) cannot do.
//
// The draw clause copies EX12-005, whose printed sentence is the same shape: a `Draw` action with
// a `cost: { kind: "trash" }` enabling payment, `optional: true` + `abortOnDecline: true` so
// declining the cost cancels the draw instead of drawing for free. Two separate effect entries
// carry the two printed timings; no [Once Per Turn] is printed, so an On Play copy and a When
// Digivolving copy each get their own activation and neither shares a `sharedUseKey`.
//
// "with [Dracomon] or [Examon] in its text" is comprehensive rules §4-22-1 — the token anywhere
// in the card's printed information — which the engine models as `match: "text"` (name ∪ traits ∪
// every printed text field). One reference holding both tokens keeps them an OR-union rather than
// an accidental conjunction. `match: "name"` would wrongly drop cards such as EX13-005 Bebydomon
// that only name [Dracomon] inside an effect, which is exactly the pool this card trashes from.
//
// The digivolve clause follows EX12-002 (and EX13-001/EX13-003 in this set): a `whenPlayed`
// SubTrigger whose `sourceFilter` gates the played Digimon, with a `Digivolve` action targeting
// the carrier (`isSelfRef` + `isSelf`) and pulling the new top out of `from: ["hand"]` at
// `reduceCost: 2`. "other" is `excludeSelf: true`, so this Digimon's own play does not arm it;
// `payCost: true` keeps the (reduced) memory cost real and `optional: true` carries "may".
// Unlike EX12-002 and the two EX13 Digi-Eggs, NO [Once Per Turn] is printed here, so the effect
// entry deliberately omits `frequency` — two qualifying plays in one turn offer two digivolves.
// The clause is printed on the card itself, not inherited, so `isInherited` stays absent; only
// the +2000 DP is an inherited entry (EX13-011's identical clause, ModifyDP/`duration:
// "permanent"` under a `YourTurn` window).
const drawByTrashing: Action = {
  kind: "Draw",
  controller: "mine",
  amount: 2,
  optional: true,
  abortOnDecline: true,
  cost: {
    kind: "trash",
    target: {
      filter: {
        zone: "hand",
        controller: "mine",
        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
      },
      count: 1,
    },
    raw: "By trashing 1 card with [Dracomon] or [Examon] in its text from your hand",
  },
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [drawByTrashing] },
    { trigger: "WhenDigivolving", actions: [drawByTrashing] },
    {
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
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
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
  digivolutionRequirement: [{ level: 3, names: ["Dracomon"], cost: 2, isAlternate: true }],
};

export { compiled };

registerIrCard("EX13-018", compiled);
