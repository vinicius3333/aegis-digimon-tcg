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
          "keyword": "Fortitude",
          "raw": "＜Fortitude＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "fromTop": true,
          "position": "top",
          "scope": "acrossDigimon",
          "condition": {
            "kind": "lastTargetCanTrashDigivolution",
            "raw": "If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards"
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "fromTop": true,
          "position": "top",
          "scope": "acrossDigimon",
          "condition": {
            "kind": "lastTargetCanTrashDigivolution",
            "raw": "If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards"
          }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 6000
              }
            },
            "count": 1
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "value": 4000
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "bindResultAs": "endOfAttackReturned"
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "bindingEmpty",
            "ref": "endOfAttackReturned",
            "raw": "If you didn't"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "names": [
        "Leomon"
      ],
      "cost": 4,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX5-055", compiled);
