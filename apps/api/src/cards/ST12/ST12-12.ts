// @ts-nocheck
// HAND-AUTHORED OVERRIDE — maintained as a direct implementation (the AUTO-GENERATED header is
// intentionally removed). The runtime record double-emitted the [On Play] "By trashing 1 card
// in your hand, ＜Draw 2＞. (Draw 2 cards from your deck.)" as TWO Draw-2 actions — one
// cost-bearing and one bare from the reminder text — so the card drew 4. This carries the
// corrected single cost-bearing Draw 2; the rest of the IR matches the runtime record output.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 2,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
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
              "keyword": "Decoy",
              "raw": "＜Decoy＞"
            }
          },
          "while": {
            "kind": "youHave",
            "filter": {
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
            "raw": "you have a Digimon in play with [Huckmon] in its name or [Royal Knight] in its traits"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST12-12", compiled);
