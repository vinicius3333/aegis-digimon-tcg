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
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "grant": "tokenEffect",
          "tokens": [
            "GRANTEFFECT23TOKEN"
          ],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Tai Kamiya"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "ADVENTURE"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have [Tai Kamiya] or a Tamer with the [ADVENTURE] trait"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "grant": "tokenEffect",
          "tokens": [
            "GRANTEFFECT23TOKEN"
          ],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Tai Kamiya"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "ADVENTURE"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have [Tai Kamiya] or a Tamer with the [ADVENTURE] trait"
          }
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "names": [
        "Agumon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "traits": [
        "ADVENTURE"
      ],
      "cost": 2,
      "isAlternate": true,
      "level": 3
    }
  ]
};

registerIrCard("BT21-057", compiled);
