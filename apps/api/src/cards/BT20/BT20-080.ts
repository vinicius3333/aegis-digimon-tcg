// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4404 (binding): after [When Digivolving] effect activates, attacking with a Digimon
// via the [All Turns] effect is optional.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Scapegoat",
          "raw": "＜Scapegoat＞"
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
                    "SoC",
                    "SEEKERS"
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
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "triggerFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "ReactivateEffect",
              "fromTrigger": "WhenDigivolving",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "count": 1
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "optional": true,
              "attackPlayer": true
            }
          ]
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
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "zone": "security",
                  "position": "top"
                },
                "count": 1
              },
              "condition": {
                "kind": "selfHasNameContaining",
                "names": [
                  "Fenriloogamon"
                ],
                "raw": "this Digimon has [Fenriloogamon] in its name"
              }
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Soloogarmon"
      ],
      "traits": [
        "SEEKERS"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "level": 5,
      "traits": [
        "SEEKERS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-080", compiled);
