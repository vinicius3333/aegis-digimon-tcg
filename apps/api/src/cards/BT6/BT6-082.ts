// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Sistermon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": "all"
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            }
          },
          "while": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Huckmon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Royal Knight"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon with [Huckmon] in its name or [Royal Knight] in its type in play"
          }
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
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-082", compiled);
