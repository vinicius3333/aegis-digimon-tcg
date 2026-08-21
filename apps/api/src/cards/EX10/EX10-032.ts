// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Hand][Main]: If you have [Close], by placing 1 [Landramon] from trash as [Sunarizamon]'s
//   bottom digivolution card, digivolve into this card for cost 3 ignoring requirements.
//   DigivolveViaPlacement encodes both the place AND the digivolve as one activated Main
//   action — the [Main] trigger is the activation gate (not a WhenDigivolving trigger).
//   The resulting digivolve still fires WhenDigivolving effects on the card after resolution.
//   (KB Q5091: combined with BT21-055 Sunarizamon's effect, cost becomes 2.)
// [On Play][When Digivolving][When Attacking]: By trashing 1 [Mineral] or [Rock] trait card
//   from your Digimon's digivolution cards (KB Q5093: can trash from another of your Digimon),
//   1 of your [Mineral] or [Rock] trait Digimon gains <Collision>, <Piercing> and +3000 DP
//   until opponent's turn ends. All three buffs apply to the SAME chosen Digimon.
// Inherited: When effects trash this card from a [Mineral] or [Rock] trait Digimon's
//   digivolution cards, <De-Digivolve 1> 1 of your opponent's Digimon.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "isFromHand": true,
      "condition": {
        "kind": "youHave",
        "filter": {
          "controllerDefault": "mine",
          "nameOrTrait": [
            {
              "tokens": ["Close"],
              "match": "name"
            }
          ]
        },
        "raw": "If you have [Close]"
      },
      "actions": [
        {
          "kind": "DigivolveViaPlacement",
          "placeCost": {
            "kind": "placeFromTrash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Landramon"],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "hostFilter": {
              "nameOrTrait": [
                {
                  "tokens": ["Sunarizamon"],
                  "match": "name"
                }
              ]
            },
            "raw": "by placing 1 [Landramon] from your trash as any of your [Sunarizamon]'s bottom digivolution card"
          },
          "into": {
            "isSelfRef": true
          },
          "cost": 3,
          "ignoreDigivolutionRequirements": true
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Mineral", "Rock"],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "bindAs": "chosen"
          },
          "keyword": {
            "keyword": "Collision",
            "raw": "＜Collision＞"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "from": ["digivolutionCards"],
              "count": 1
            },
            "raw": "By trashing any 1 [Mineral] or [Rock] trait card from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "ModifyDP",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Mineral", "Rock"],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "bindAs": "chosen"
          },
          "keyword": {
            "keyword": "Collision",
            "raw": "＜Collision＞"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "from": ["digivolutionCards"],
              "count": 1
            },
            "raw": "By trashing any 1 [Mineral] or [Rock] trait card from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "ModifyDP",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Mineral", "Rock"],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "bindAs": "chosen"
          },
          "keyword": {
            "keyword": "Collision",
            "raw": "＜Collision＞"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "from": ["digivolutionCards"],
              "count": 1
            },
            "raw": "By trashing any 1 [Mineral] or [Rock] trait card from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "ModifyDP",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["Mineral", "Rock"],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "DeDigivolve",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-032", compiled);

export { compiled };
