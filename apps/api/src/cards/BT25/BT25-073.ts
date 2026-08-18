// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT25-073 Dragomon
// ＜Jamming＞
// [On Play] [When Digivolving] By trashing 1 of your Digimon's link cards, you may
//   play or use 1 [TS] trait card with a play or use cost of 5 or less from your
//   hand without paying the cost.
// [inherited] [All Turns] By trashing 1 of its link cards, this Digimon doesn't leave play.
//
// Audit fixes:
// 1. Cost filter must target a link card (zone:"linked") of a Digimon — not any Digimon.
//    zone:"linked" is a new vocabulary; see LANE_C.md for LinkedZone capability spec.
//    The cost raw field describes the intent; the filter is the faithful shape.
// 2. "play or use" — the text allows using Option cards too, but PlayWithoutCost only
//    plays Digimon/Tamer. A "UseOption" or Modal action is needed for the Option path.
//    See LANE_C.md for PlayOrUseWithoutCost capability spec.
//    For now: PlayWithoutCost covers Digimon/Tamer; Option use is a residual.
// 3. The inherited Replacement cost targets "its link cards" — the linked zone of the
//    Digimon that would leave play (self-ref Digimon's linked cards).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Jamming",
          "raw": "＜Jamming＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "zone": "linked"
              },
              "count": 1
            },
            "raw": "By trashing 1 of your Digimon's link cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "zone": "linked"
              },
              "count": 1
            },
            "raw": "By trashing 1 of your Digimon's link cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [],
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "isSelfRef": true,
                "zone": "linked"
              },
              "count": 1
            },
            "raw": "by trashing 1 of its link cards, it doesn't leave"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "partial",
  "residual": [
    "use 1 [TS] trait Option card with a use cost of 5 or less from your hand without paying the cost"
  ],
  "digivolutionRequirement": [
    {
      "level": 4,
      "traits": [
        "TS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-073", compiled);
