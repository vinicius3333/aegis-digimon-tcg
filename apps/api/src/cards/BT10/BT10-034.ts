// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Xros Heart"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have another Digimon or Tamer with [Xros Heart] in its traits in play"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "optional": true
        }
      ],
      "keywords": [
        {
          "keyword": "Save",
          "raw": "＜Save＞"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "effect": {
            "kind": "modifyDP",
            "amount": -2000
          },
          "while": {
            "kind": "selfHasNameContaining",
            "names": ["Shoutmon"],
            "raw": "this Digimon has [Shoutmon] in its name"
          }
        },
        {
          "kind": "ModifySecurityDP",
          "controller": "opponent",
          "amount": -2000,
          "duration": "permanent",
          "condition": {
            "kind": "selfHasNameContaining",
            "names": ["Shoutmon"],
            "raw": "this Digimon has [Shoutmon] in its name"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "traits": [
        "Xros Heart"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT10-034", compiled);
