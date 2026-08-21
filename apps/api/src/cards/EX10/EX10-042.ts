// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1,
            "from": [
              "trash"
            ]
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 2
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1,
            "from": [
              "trash"
            ]
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "sourceFilter": { "isSelfRef": true },
          "actions": [
            {
              "kind": "Digivolve",
              "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true },
              "into": {
                "controllerDefault": "mine",
                "nameOrTrait": [{ "tokens": ["Regulusmon"], "match": "name" }]
              },
              "from": ["hand", "trash"],
              "reduceCost": 1,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Gammamon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX10-042", compiled);

export { compiled };
