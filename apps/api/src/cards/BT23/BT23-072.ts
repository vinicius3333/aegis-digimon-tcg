import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-072 King Drasil_7D6 — hand-authored IR override.
//
// The [Hand][Main] cost is all-or-nothing, the played-Digimon keyword grant targets the
// whenPlayed trigger subject, and the inherited breeding condition is structured.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true,
              "from": [
                "hand"
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": {
              "filter": {
                "controller": "mine",
                "zone": "breeding",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "King Drasil_7D6",
                      "Mother Eater"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "raw": "placing this card as the bottom digivolution card of your [King Drasil_7D6] or [Mother Eater] in the breeding area"
          },
          "additionalCosts": [
            {
              "kind": "payMemory",
              "memory": 3,
              "raw": "paying 3 cost"
            }
          ],
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Royal Knight",
                  "CS"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                },
                "count": 1,
                "sourceRef": "triggerSubject"
              },
              "keyword": {
                "keyword": "Rush",
                "raw": "＜Rush＞"
              },
              "duration": "untilOpponentTurnEnd",
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Digimon"
              },
              "optional": true,
              "abortOnDecline": true
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                },
                "count": 1,
                "sameTarget": true
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
                },
                "count": 1,
                "sameTarget": true
              },
              "keyword": {
                "keyword": "Reboot",
                "raw": "＜Reboot＞"
              },
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                },
                "count": 1,
                "sameTarget": true
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            }
          ],
          "raw": "whenPlayed"
        }
      ]
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "King Drasil"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "fromOwnDigivolutionStack": true,
          "payCost": false,
          "condition": {
            "kind": "selfDigivolutionCountAtLeast",
            "value": 6
          },
          "optional": true
        }
      ],
      "isInherited": true,
      "isBreeding": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT23-072", compiled);
