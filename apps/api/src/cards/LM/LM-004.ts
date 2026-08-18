// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]: By trashing 2 blue cards in hand, unsuspend 1 of your
// Digimon and 1 of your [Kiyoshiro Higashimitarai] (Tamer), and this Digimon gains
// <Blocker> until the end of your opponent's turn.
// Inherited: [All Turns] [Once Per Turn] unsuspend this Digimon.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Sequence",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "colors": [
                  "Blue"
                ]
              },
              "count": 2
            },
            "raw": "By trashing 2 blue cards in your hand"
          },
          "optional": true,
          "abortOnDecline": true,
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              }
            },
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Kiyoshiro Higashimitarai"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              }
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Sequence",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "colors": [
                  "Blue"
                ]
              },
              "count": 2
            },
            "raw": "By trashing 2 blue cards in your hand"
          },
          "optional": true,
          "abortOnDecline": true,
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              }
            },
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Kiyoshiro Higashimitarai"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "count": 1
              }
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            }
          ]
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("LM-004", compiled);
