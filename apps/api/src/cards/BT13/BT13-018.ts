// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "grant": "kind",
          "tokens": [
            "Digimon"
          ],
          "staticEffect": {
            "kind": "SetBaseDP",
            "value": 3000
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "RestrictDigivolveInto",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "not": true,
            "kind": [
              "Digimon"
            ]
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "grant": "kind",
          "tokens": [
            "Digimon"
          ],
          "staticEffect": {
            "kind": "SetBaseDP",
            "value": 3000
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "RestrictDigivolveInto",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "into": {
            "not": true,
            "kind": [
              "Digimon"
            ]
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Marcus Damon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ],
            "colors": [
              "Red",
              "Yellow"
            ]
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": -6000,
              "duration": "forTheTurn"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "names": [
        "RizeGreymon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT13-018", compiled);
