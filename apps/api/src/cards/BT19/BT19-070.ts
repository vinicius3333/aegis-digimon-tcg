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
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your Digimon"
          },
          "abortOnDecline": true,
          "raw": "Delete 1 opponent level 3 Digimon."
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                4
              ]
            },
            "count": 1
          },
          "raw": "Delete 1 opponent level 4 Digimon."
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                5
              ]
            },
            "count": 1
          },
          "raw": "Delete 1 opponent level 5 Digimon."
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your Digimon"
          },
          "abortOnDecline": true,
          "raw": "Delete 1 opponent level 3 Digimon."
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                4
              ]
            },
            "count": 1
          },
          "raw": "Delete 1 opponent level 4 Digimon."
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                5
              ]
            },
            "count": 1
          },
          "raw": "Delete 1 opponent level 5 Digimon."
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "Machinedramon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "colors": [
                  "Purple",
                  "Red"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 4
                }
              },
              "count": 1
            },
            "raw": "By deleting 1 of your level 4 or lower purple or red Digimon"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "Composite"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "kind": ["Digimon"],
          "levelComparison": { "op": "eq", "value": 4 },
          "nameOrTrait": [{ "tokens": ["Composite"], "match": "trait" }],
          "differentCardNumbers": true
        }
      ],
      "count": 3,
      "costReduction": 1
    }
  ]
};

registerIrCard("BT19-070", compiled);
