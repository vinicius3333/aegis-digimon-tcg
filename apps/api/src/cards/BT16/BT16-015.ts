// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": {
            "keyword": "EndOfAttack",
            "targetFilter": {
              "keyword": "OnDeletion"
            }
          },
          "duration": "forTheTurn",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Phoenixmon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Phoenixmon] or [X Antibody] is in this Digimon's digivolution cards"
          }
        }
      ],
      "keywords": [
        {
          "keyword": "Blitz",
          "raw": "＜Blitz＞"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": {
            "keyword": "EndOfAttack",
            "targetFilter": {
              "keyword": "OnDeletion"
            }
          },
          "duration": "forTheTurn",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Phoenixmon",
                    "X Antibody"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "[Phoenixmon] or [X Antibody] is in this Digimon's digivolution cards"
          }
        }
      ],
      "keywords": [
        {
          "keyword": "Blitz",
          "raw": "＜Blitz＞"
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
              "excludeNameOrTrait": [
                {
                  "tokens": [
                    "Sea Animal"
                  ],
                  "match": "trait"
                }
              ],
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Red"
              ],
              "dp": {
                "op": "lte",
                "value": 11000
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Avian",
                    "Bird",
                    "Beast",
                    "Animal",
                    "Sovereign"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true,
          "bindResultAs": "playedDigimon"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "valueFrom": "playedDigimon",
                "valueField": "dp"
              }
            },
            "count": 1
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Phoenixmon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-015", compiled);
