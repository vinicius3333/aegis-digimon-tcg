// @ts-nocheck
// LM-005 Amphimon — hand-fixed IR.
// KB Q3994: trash 2 blue cards => trash 1 under each of 2 Digimon/Tamers (usePaidCount scales).
// KB Q3995: WhenAttacking SecurityAttack+1 can fire multiple times in a turn if Digimon attacks again.
// Fixes applied:
//   - actions[1] scaling uses usePaidCount:true (count of blue cards trashed in action 0)
//   - actions[2] return target filter adds digivolutionCards:"none"
//   - WhenAttacking: added SecurityAttack+1 for the turn behind a return-3-Jellymon cost
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "colors": [
                "Blue"
              ]
            },
            "count": 4,
            "upTo": true
          },
          "optional": true
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards",
            "usePaidCount": true
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "digivolutionCards": "none"
            },
            "count": 1
          },
          "to": "hand"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine",
              "colors": [
                "Blue"
              ]
            },
            "count": 4,
            "upTo": true
          },
          "optional": true
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "controllerDefault": "mine"
            },
            "unit": "cards",
            "usePaidCount": true
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "digivolutionCards": "none"
            },
            "count": 1
          },
          "to": "hand"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
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
            "keyword": "SecurityAttack",
            "amount": 1,
            "raw": "＜Security Attack +1＞"
          },
          "duration": "forTheTurn",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jellymon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 3,
              "from": [
                "trash"
              ]
            },
            "to": "deckBottom",
            "raw": "By returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("LM-005", compiled);
