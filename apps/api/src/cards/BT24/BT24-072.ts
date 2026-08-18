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
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Demon",
                    "Shaman",
                    "Titan"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd",
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
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Demon",
                    "Shaman",
                    "Titan"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "Retaliation",
            "raw": "＜Retaliation＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Demon",
                    "Shaman",
                    "Titan"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd",
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
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Demon",
                    "Shaman",
                    "Titan"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "Retaliation",
            "raw": "＜Retaliation＞"
          },
          "duration": "untilOpponentTurnEnd"
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
                    "Demon",
                    "Titan"
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
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "SecurityAttack",
              "amount": 1,
              "raw": "＜Security Attack +1＞"
            }
          },
          "while": {
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "selfHasName",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Titamon"
                    ],
                    "match": "name"
                  }
                ]
              },
              {
                "kind": "selfHasTrait",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Titan"
                      ],
                      "match": "trait"
                    }
                  ]
                }
              }
            ],
            "raw": "this Digimon is [Titamon] or has the [Titan] trait"
          }
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
      "traits": [
        "Demon",
        "TS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-072", compiled);
