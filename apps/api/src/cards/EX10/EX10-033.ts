// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
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
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Mineral",
                    "Rock"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 3,
            "upTo": true,
            "from": [
              "trash"
            ]
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0",
      "optional": true
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Mineral",
                    "Rock"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 3,
            "upTo": true,
            "from": [
              "trash"
            ]
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0",
      "optional": true
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "play",
          "amount": 2,
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Mineral",
                      "Rock"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 3,
              "upTo": true
            },
            "raw": "By trashing up to 3 [Mineral] or [Rock] trait cards from any of your Digimon's digivolution cards"
          },
          "abortOnDecline": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "CostModifier",
          "mode": "reduce",
          "costType": "play",
          "amount": 2,
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Mineral",
                      "Rock"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 3,
              "upTo": true
            },
            "raw": "By trashing up to 3 [Mineral] or [Rock] trait cards from any of your Digimon's digivolution cards"
          },
          "abortOnDecline": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-033", compiled);
