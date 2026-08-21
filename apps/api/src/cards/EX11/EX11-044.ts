// @ts-nocheck
// HAND-FIXED IR for EX11-044 — do not regenerate.
// Delete cost: count corrected to 3 (was 1); added superlative:highestPlayCost; fixed
// cost filter (kind:Digimon removed, zone added). AllTurns: plain PlaceUnder converted
// to SubTrigger (fires when digivolution cards are trashed); PlaceUnder corrected from
// Save form to standard form (Mineral/Rock from trash → self bottom).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "digivolutionRequirement": [
    { "level": 5, "cost": 3, "isAlternate": true }
  ],
  "effects": [
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
          "keyword": "Fragment",
          "amount": 3,
          "raw": "＜Fragment (3)＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"],
              "superlative": "highestPlayCost"
            },
            "count": 1
          },
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
              "count": 3
            },
            "raw": "By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ex11-044-main-effect"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"],
              "superlative": "highestPlayCost"
            },
            "count": 1
          },
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
              "count": 3
            },
            "raw": "By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ex11-044-main-effect"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"],
              "superlative": "highestPlayCost"
            },
            "count": 1
          },
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
              "count": 3
            },
            "raw": "By trashing any 3 [Mineral] or [Rock] trait cards from your Digimon's digivolution cards"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ex11-044-main-effect"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenDigivolutionTrashed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "PlaceUnder",
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
                "from": ["trash"],
                "count": 3,
                "upTo": true
              },
              "underFilter": {
                "isSelfRef": true
              },
              "position": "bottom",
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX11-044", compiled);
