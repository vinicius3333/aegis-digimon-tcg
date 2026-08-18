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
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Lucemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Digimon with [Lucemon] in its name in its name on the field"
          }
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "controller": "mine"
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Lucemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Digimon with [Lucemon] in its name in its name"
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by returning this card to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "trashSecurityTop",
          "controller": "mine",
          "count": 1,
          "optional": true
        },
        {
          "kind": "Attack",
          "target": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Lucemon"
                ],
                "match": "name"
              }
            ]
          },
          "withoutSuspending": true
        }
      ],
      "isFromTrash": true
    },
    {
      "trigger": "Main",
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
                    "Lucemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Raid",
            "raw": "＜Raid＞"
          },
          "duration": "untilOpponentTurnEnd"
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
                    "Lucemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "untilOpponentTurnEnd"
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
                    "Lucemon"
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
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Lucemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Lucemon"
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
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-071", compiled);
