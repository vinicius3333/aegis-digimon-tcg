// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decoy",
          "raw": "＜Decoy (Deva/Four Sovereigns)＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
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
                    "Deva"
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
          "breeding": true,
          "notSameNameAs": [
            "battleArea",
            "trash"
          ],
          "optional": true
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
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
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            }
          },
          "while": {
            "kind": "selfHasTrait", "filter": {"nameOrTrait": [{"tokens": ["Four Sovereigns","God Beast"], "match": "trait"}]},
            "raw": "this Digimon has the [Four Sovereigns]/[God Beast] trait"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX5-050", compiled);
