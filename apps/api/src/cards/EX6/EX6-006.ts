import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for EX6-006 (Gate of Deadly Sins; Purple Lv.7 Digimon).
//
// The AUTO-GENERATED header was removed (card-module contract) to preserve this hand-edit
// across regeneration. Hand-edits over the runtime record baseline:
//   1. [Breeding][Start of Your Main Phase] is ONE effect (a {Breeding}-resident timed effect,
//      like BT22-007), not two effects split across "Breeding" and "StartOfYourMainPhase"
//      triggers — [Breeding] here is a location restriction ("only while in the breeding
//      area"), not an independent trigger timing. Its egg-deck hatch clause uses two
//      structured actions instead of RawUnparsed: PlaceUnder{fromEggDeck} places the TOP of
//      the Digi-Egg deck under THIS Digimon (KB Q3694: happens even with 0 egg-deck cards —
//      the primitive no-ops — but the Delete below still runs), then Delete{mine,Digimon,all}
//      removes all of the controller's BATTLE-AREA Digimon (the breeding-area self is not in
//      the battle area, so it is not self-deleted). The trailing conditional PlaceUnder's
//      "this effect deleted" gate reads the just-run Delete's actual removal count (raw
//      pattern in interpreter.ts's evaluateCondition), not an unconditional/ambiguous string.
//   2. [Breeding][End of Opponent's Turn] is likewise ONE {Breeding}-resident effect on the
//      "EndOfOpponentsTurn" trigger, not split across "Breeding"/"EndOfOpponentsTurn". Its
//      deleteOwn cost now carries a structured condition ("N or more cards with different
//      names in its digivolution cards", matched by the same interpreter raw pattern) instead
//      of leaving the threshold only inside the cost's descriptive `raw` string.
//   3. The inherited [Breeding][Your Turn][Once Per Turn] ability is ONE effect (trigger
//      "YourTurn", isBreeding: true, frequency: "OncePerTurn" applied ONCE to the whole
//      ability), not two split effects each independently OncePerTurn (which would let the
//      reduction be used twice per turn). Its reduce-by-3 / reduce-by-4 clauses are now a
//      single Replacement action's mutually-exclusive `amountChoices` (interpreter.ts) rather
//      than two independent Replacement installs — `costReductionFor` SUMS every active
//      reduceCost subscription anchored to the same source permanent, so two simultaneous
//      installs would silently stack the discount to 7. KB Q3700 confirms the controller may
//      still choose the plain +3 reduction even when the +4 threshold (5+ distinct
//      digivolution-card names) is met, so both amounts stay live choices — never automatic
//      upgrades, never additive.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "PlaceUnder",
          "fromEggDeck": true,
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Seven Great Demon Lords"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "this effect deleted"
          }
        }
      ],
      "isBreeding": true
    },
    {
      "trigger": "EndOfOpponentsTurn",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Ogudomon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "By deleting this Digimon with 7 or more cards with different names in its digivolution cards"
          },
          "condition": {
            "kind": "selfDigivolutionStackDistinctNameCount",
            "op": "gte",
            "value": 7,
            "raw": "this Digimon has 7 or more cards with different names in its digivolution cards"
          },
          "optional": true
        }
      ],
      "isBreeding": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "mode": "reduceCost",
          "optional": true,
          "amountChoices": [
            {
              "amount": 3,
              "raw": "Reduce the play cost by 3."
            },
            {
              "amount": 4,
              "raw": "Reduce the play cost by 4.",
              "condition": {
              "kind": "selfDigivolutionStackDistinctNameCount",
              "op": "gte",
              "value": 5,
                "raw": "this Digimon has 5 or more cards with different names in its digivolution cards"
              }
            }
          ],
          "raw": "When one of your Digimon with the [Seven Great Demon Lords] trait would be played, you may reduce the play cost by 3. If this Digimon has 5 or more cards with different names in its digivolution cards, you may reduce the play cost by 4 instead."
        }
      ],
      "isInherited": true,
      "isBreeding": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("EX6-006", compiled);
