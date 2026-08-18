// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "underFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "King Drasil_7D6"
                ],
                "match": "name"
              }
            ]
          },
          "optional": true
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ],
              "location": "breedingArea"
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true,
          "suppressOnPlayEffects": true,
          "bindResultAs": "playedDigimon"
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "bindReference": "playedDigimon"
          },
          "keyword": {
            "keyword": "Rush",
            "raw": "＜Rush＞"
          },
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT13-110", compiled);
