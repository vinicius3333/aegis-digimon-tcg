// @ts-nocheck
// HAND-FIXED IR for BT24-077 (Revivemon) — do not regenerate over this file.
//
// runtime-effect fix: "[When Digivolving] [On Deletion] You may link 1 level 4 or lower
// Digimon card from your trash or this Digimon's digivolution cards to 1 of your
// Digimon without paying the cost" is the LINK mechanic (a card attached under a
// chosen recipient Digimon, KB Q5654: a card without <Link> can't be linked this way),
// not PlayWithoutCost (which plays the card as its own new battle-area permanent). Both
// clauses recompiled to the Link action kind with a level<=4 filter, a recipient target
// ("to 1 of your Digimon"), and from:["trash","digivolutionCards"].
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
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
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "recipient": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "from": [
            "trash",
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "recipient": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "from": [
            "trash",
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Appmon"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "appFusionRequirement": [
    {
      "names": [
        "Raidramon",
        "Dezipmon"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("BT24-077", compiled);
