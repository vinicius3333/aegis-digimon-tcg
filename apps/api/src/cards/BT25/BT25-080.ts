// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Titan"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "triggerEnteredByEffect",
            "raw": "if played by an effect"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Titan"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": 1
          },
          "condition": {
            "kind": "triggerEnteredByEffect",
            "raw": "if played by an effect"
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenHandTrashed",
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
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
              "condition": {
                "kind": "selfDigivolutionStackHasTrait",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Titan"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "raw": "this Digimon has the [Titan] trait"
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
      "level": 3,
      "traits": [
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-080", compiled);
