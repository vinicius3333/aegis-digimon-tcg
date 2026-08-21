// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Imperialdramon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "Free"
                ],
                "match": "trait"
              }
            ],
            "zone": "hand"
          },
          "payCost": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          }
        },
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Imperialdramon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "Free"
                ],
                "match": "trait"
              }
            ],
            "zone": "hand"
          },
          "payCost": true,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Retaliation",
          "raw": "＜Retaliation＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT20-066", compiled);
