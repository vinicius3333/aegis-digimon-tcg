// @ts-nocheck
// Hand-authored override for BT25-097 (Guardian Palace).
// runtime-effect fix:
// - AllTurns (Security effect): add conditional <Scapegoat> grant via Aura while you have
//   a Digimon with [Junomon] in its name (KB Q6463: even if lost after activation, processing continues).
// - Main effect: structure preserved (SecurityManipulation toHand + placeAsSecurity face-up bottom +
//   optional play from hand with cost reduced by 3). Q6458: if 0 security, skip toHand, only place self.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine"
            },
            "raw": "you have no face-up security cards"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Yellow",
                "Purple"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Alliance",
            "raw": "＜Alliance＞"
          },
          "duration": "permanent"
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "colors": ["Yellow", "Purple"],
              "nameOrTrait": [
                {
                  "tokens": ["TS"],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Scapegoat",
              "raw": "＜Scapegoat＞"
            }
          },
          "while": {
            "kind": "youHave",
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Junomon"],
                  "match": "name"
                }
              ]
            },
            "count": 1,
            "raw": "while you have a Digimon with [Junomon] in its name"
          }
        }
      ],
      "isSecurity": true
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "position": "bottom"
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "toTop": false,
          "faceUp": true
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Yellow",
                "Purple"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
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
          "payCost": true,
          "reduceCostBy": 3,
          "optional": true
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Yellow",
                "Purple"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "TS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT25-097", compiled);
