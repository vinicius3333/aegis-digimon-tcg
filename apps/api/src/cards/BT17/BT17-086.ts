// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ]
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Pulsemon"
                  ],
                  "match": "text"
                }
              ]
            },
            "raw": "you have a Digimon with [Pulsemon] in its text"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Pulsemon"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "underFilter": {
            "isSelfRef": true,
            "position": "bottom",
            "condition": {
              "noTamerInDigivolution": true
            }
          }
        }
      ],
      "keywords": [
        {
          "keyword": "Mind Link",
          "raw": "＜Mind Link＞"
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
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            }
          },
          "while": {
            "kind": "selfTopHasText", "filter": {"nameOrTrait": [{"tokens": ["Pulsemon"], "match": "text"}]},
            "raw": "this Digimon has [Pulsemon] in its text"
          }
        },
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
              "keyword": "Barrier",
              "raw": "＜Barrier＞"
            }
          },
          "while": {
            "kind": "selfTopHasText", "filter": {"nameOrTrait": [{"tokens": ["Pulsemon"], "match": "text"}]},
            "raw": "this Digimon has [Pulsemon] in its text"
          }
        }
      ],
      "isInherited": true
    },
    {
      "trigger": "EndOfAllTurns",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Leon Alexander"
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
          "payCost": false,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT17-086", compiled);
