import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 [Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "sharedUseKey": "when-digivolving-place-draw",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "raw": "By placing 1 [Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
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
            "kind": ["Option"]
            },
            "count": 1
            },
          "from": ["trash"],
          "payCost": true,
          "costReduction": 3,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "isSelfRef": true,
                "zone": "digivolutionCards",
                "kind": [
                  "Option"
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 Option card from any of your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "trash-source-use-option"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
            "kind": ["Option"]
            },
            "count": 1
            },
          "from": ["trash"],
          "payCost": true,
          "costReduction": 3,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "isSelfRef": true,
                "zone": "digivolutionCards",
                "kind": ["Option"]
              },
              "count": 1
            },
            "raw": "By trashing 1 Option card from any of your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "trash-source-use-option"
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
                    "Three Musketeers"
                  ],
                  "match": "text"
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
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "texts": [
        "Three Musketeers"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": [
        "TS"
      ],
      "cost": 3,
      "isAlternate": true,
      "level": 4
    }
  ]
};

registerIrCard("BT25-083", compiled);
