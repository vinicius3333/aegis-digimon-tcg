// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Security]: play this card without paying the cost.
// [Start of Your Main Phase]: by trashing 1 [Machine]/[Cyborg]/[SoC] card from hand, gain 1 memory.
// [Main] <Mind Link>: place this Tamer as bottom digivolution card of 1 of your [Machine]/[Cyborg]/[SoC] Digimon
//   if there are no Tamer cards in its digivolution cards.
// Inherited [All Turns]: while this Digimon has [Machine]/[Cyborg]/[SoC] trait, gains <Jamming> and <Blocker>.
// Inherited [End of All Turns]: you may play 1 [Marvin Jackson] from this Digimon's digivolution cards without cost.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "SoC"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with the [Machine]/[Cyborg]/[SoC] trait in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "MindLink",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Machine",
                    "Cyborg",
                    "SoC"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Jamming",
              "raw": "＜Jamming＞"
            }
          },
          "while": {
            "kind": "selfTopHasText",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Machine",
                    "Cyborg",
                    "SoC"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "while this Digimon has the [Machine]/[Cyborg]/[SoC] trait"
          }
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            }
          },
          "while": {
            "kind": "selfTopHasText",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Machine",
                    "Cyborg",
                    "SoC"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "while this Digimon has the [Machine]/[Cyborg]/[SoC] trait"
          }
        }
      ],
      "isInherited": true
    },
    {
      "trigger": "EndOfAllTurns",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marvin Jackson"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "fromOwnDigivolutionStack": true,
          "payCost": false,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-086", compiled);
