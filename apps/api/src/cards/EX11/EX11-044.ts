// @ts-nocheck
// HAND-FIXED IR for EX11-044 — do not regenerate.
// Delete cost: count corrected to 3 (was 1); added superlative:highestPlayCost; fixed
// cost filter (kind:Digimon removed, zone added). AllTurns: plain PlaceUnder converted
// to SubTrigger (fires when digivolution cards are trashed); PlaceUnder corrected from
// Save form to standard form (Mineral/Rock from trash → self bottom).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
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
      "frequency": "OncePerTurn"
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
      "frequency": "OncePerTurn"
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
      "frequency": "OncePerTurn"
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
  "coverage": "partial",
  "residual": [
    "Cost trash 'from digivolutionCards': interpreter currently limits trash to the SOURCE Digimon's stack but Q5890 allows trashing from multiple Digimon's stacks — engine needs cross-Digimon stack trash support.",
    "[Once Per Turn] shared across OnPlay/WhenDigivolving/WhenAttacking: printed text has one OPT tag covering all three triggers; IR gives each its own OPT counter. In practice these triggers are mutually exclusive per turn (can't play AND digivolve AND attack with the same Digimon), so the functional difference is nil. Shared-OPT-group mechanism would need a new IR feature.",
    "PlaceUnder target count:3+upTo:true: Q5891 you must place 3 if 3+ available; Q5892 you may place 1 if only 1 available. The IR faithfully encodes 'up to 3' (upTo:true) with optional:true (can decline entirely). The 'upTo' is the correct encoding per both rulings."
  ]
};

registerIrCard("EX11-044", compiled);
