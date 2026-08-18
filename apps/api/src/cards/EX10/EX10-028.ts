// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5083: the trash cost can target a digivolution card from any of your Digimon's stacks.
// KB Q5100: the inherited effect reads the final play cost (after reduction) to check the
// 4-or-less threshold, so it interacts with cost-reduction effects.
// [On Play][When Digivolving] cost: trash any 1 Mineral/Rock trait CARD from your Digimon's
//   digivolution cards (filter is on the CARD being trashed, not the host Digimon).
//   Effect: 1 of your Mineral/Rock trait Digimon gains <Reboot>, <Blocker>, and +3000 DP
//   until opponent's turn ends. All three apply to the same chosen Digimon; use selectionRef.
// Inherited: whenTrashedFromDigivolutionCards — sourceFilter gates on the HOST Digimon
//   having Mineral or Rock trait (the Digimon whose stack this card was in).
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
                    "Mineral",
                    "Rock"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "selectionRef": "chosen"
          },
          "keyword": {
            "keyword": "Reboot",
            "raw": "＜Reboot＞"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
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
              "from": [
                "digivolutionCards"
              ],
              "count": 1
            },
            "raw": "By trashing any 1 card with the [Mineral] or [Rock] trait from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "chosen"
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
            "fromSelectionRef": "chosen"
          },
          "amount": 3000,
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
                    "Mineral",
                    "Rock"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "selectionRef": "chosen"
          },
          "keyword": {
            "keyword": "Reboot",
            "raw": "＜Reboot＞"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
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
              "from": [
                "digivolutionCards"
              ],
              "count": 1
            },
            "raw": "By trashing any 1 card with the [Mineral] or [Rock] trait from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "chosen"
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
            "fromSelectionRef": "chosen"
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "sourceFilter": {
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
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "playCostLte": 4
                },
                "count": 1
              }
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-028", compiled);
