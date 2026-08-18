// @ts-nocheck
// HAND-FIXED IR for LM-001 — do not regenerate.
// [Hand][Counter] parenthetical "(Your Digimon may digivolve into this card without
// paying the cost)" = BlastDigivolve keyword mechanic (same as ＜Blast Digivolve＞).
// CostModifier scaling filter restricted to this Digimon's digivolution cards (colors).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Hand",
      "actions": [],
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)"
        }
      ]
    },
    {
      "trigger": "Counter",
      "actions": [],
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Gammamon"],
                  "match": "text"
                }
              ]
            },
            "from": ["hand"],
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "kind": ["Digimon"]
          },
          "position": "bottom",
          "optional": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": {
                "op": "lte",
                "value": 8000
              }
            },
            "count": 1
          }
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dpDeletion",
          "amount": 1000,
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "digivolutionCards",
              "isSelfRef": true
            },
            "unit": "colors"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Gammamon"],
                  "match": "text"
                }
              ]
            },
            "from": ["hand"],
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "kind": ["Digimon"]
          },
          "position": "bottom",
          "optional": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "dp": {
                "op": "lte",
                "value": 8000
              }
            },
            "count": 1
          }
        },
        {
          "kind": "CostModifier",
          "mode": "raiseCeiling",
          "costType": "dpDeletion",
          "amount": 1000,
          "scaling": {
            "per": 1,
            "filter": {
              "zone": "digivolutionCards",
              "isSelfRef": true
            },
            "unit": "colors"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controllerDefault": "mine",
            "excludeSelf": true,
            "kind": ["Digimon"]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
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

registerIrCard("LM-001", compiled);
