// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-028 GigaSeadramon — Lv.7 Digimon
// <Security A. +1>, <Reboot>, <Blocker>
// [When Digivolving][When Attacking][Once Per Turn] From the digivolution cards of this Digimon
//   with [MetalSeadramon] (name) or [X Antibody] (trait) in its digivolution cards, you may
//   play 1 level 5 or lower Digimon card without paying the cost.
// [All Turns][Once Per Turn] When any of your Digimon are played from digivolution cards,
//   <De-Digivolve 2> 1 of your opponent's Digimon.
//
// KB Q4320: Effect can't activate without [MetalSeadramon] or [X Antibody] in digivolution cards.
// KB Q4321: Triggers when this card itself is played from digivolution cards.
// Audit finding: [MetalSeadramon] is NAME match, [X Antibody] is TRAIT match.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "kind": [
                "Digimon"
              ],
              "level": {
                "max": 5
              }
            },
            "count": 1,
            "from": [
              "digivolutionCards"
            ]
          },
          "payCost": false,
          "optional": true
        }
      ],
      "condition": {
        "kind": "youHave",
        "filter": {
          "isSelfRef": true,
          "digivolutionStackNameOrTrait": [
            {
              "tokens": [
                "MetalSeadramon"
              ],
              "match": "name"
            },
            {
              "tokens": [
                "X Antibody"
              ],
              "match": "trait"
            }
          ]
        },
        "raw": "this Digimon has [MetalSeadramon] or [X Antibody] in its digivolution cards"
      },
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "kind": [
                "Digimon"
              ],
              "level": {
                "max": 5
              }
            },
            "count": 1,
            "from": [
              "digivolutionCards"
            ]
          },
          "payCost": false,
          "optional": true
        }
      ],
      "condition": {
        "kind": "youHave",
        "filter": {
          "isSelfRef": true,
          "digivolutionStackNameOrTrait": [
            {
              "tokens": [
                "MetalSeadramon"
              ],
              "match": "name"
            },
            {
              "tokens": [
                "X Antibody"
              ],
              "match": "trait"
            }
          ]
        },
        "raw": "this Digimon has [MetalSeadramon] or [X Antibody] in its digivolution cards"
      },
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "fromDigivolution": true
          },
          "actions": [
            {
              "kind": "DeDigivolve",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": 2
            }
          ],
          "raw": "When any of your Digimon are played from digivolution cards, De-Digivolve 2"
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "MetalSeadramon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-028", compiled);
