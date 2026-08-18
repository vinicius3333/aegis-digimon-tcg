// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": [
        "StartOfYourMainPhase",
        "OnPlay"
      ],
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "zone": "hand",
              "controller": "mine"
            },
            "count": 1
          },
          "raw": "By trashing 1 card in your hand"
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "optional": true,
          "abortOnDecline": true,
          "optionalController": "opponent",
          "bindResultAs": "opponentTrashedSecurity"
        },
        {
          "kind": "RecoverByTrashingMostSecurity",
          "amount": 1,
          "optional": false,
          "condition": {
            "kind": "bindingEmpty",
            "ref": "opponentTrashedSecurity",
            "raw": "opponent didn't trash security"
          }
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "into": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Lucemon: Chaos Mode"
                ],
                "match": "name"
              }
            ],
            "exclude": [
              {
                "cardID": "BT7-111"
              }
            ]
          },
          "payCost": false,
          "from": [
            "trash"
          ],
          "optional": true,
          "cost": {
            "kind": "placeAsSecurity",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levels": [
                  6
                ],
                "zone": "battleArea"
              },
              "count": 1
            },
            "raw": "By placing 1 of your level 6 Digimon on top of your security stack",
            "destination": "security",
            "position": "top"
          },
          "abortOnDecline": true,
          "ignoreRequirements": false
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Cupimon"
      ],
      "cost": 5,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-034", compiled);
