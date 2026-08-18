// @ts-nocheck
// HAND-FIXED IR for BT14-086 — do not regenerate.
// AllTurns Aura target filters: added Numemon+Monzaemon names alongside [DigiPolice] trait.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has a Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "MindLink",
          "target": {
            "filter": {
              "or": [
                {
                  "nameOrTrait": [{ "tokens": ["Numemon"], "match": "name" }]
                },
                {
                  "nameOrTrait": [{ "tokens": ["Monzaemon"], "match": "name" }]
                },
                {
                  "trait": "DigiPolice"
                }
              ]
            },
            "count": 1,
            "controller": "mine"
          }
        },
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
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
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DigiPolice"
                  ],
                  "match": "trait"
                },
                {
                  "tokens": [
                    "Numemon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Monzaemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Jamming",
              "raw": "＜Jamming＞"
            }
          },
          "while": {
            "kind": "selfHasNameContaining",
            "names": ["Numemon", "Monzaemon"],
            "raw": "this Digimon has [Numemon] or [Monzaemon] in its name"
          }
        },
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DigiPolice"
                  ],
                  "match": "trait"
                },
                {
                  "tokens": [
                    "Numemon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Monzaemon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Reboot",
              "raw": "＜Reboot＞"
            }
          },
          "while": {
            "kind": "selfHasNameContaining",
            "names": ["Numemon", "Monzaemon"],
            "raw": "this Digimon has [Numemon] or [Monzaemon] in its name"
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
                    "Satsuki Tamahime"
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
    },
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
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-086", compiled);
