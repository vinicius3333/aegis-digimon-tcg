import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "youHave",
                "filter": {
                  "zone": "battleArea",
                  "controllerDefault": "mine",
                  "kind": ["Digimon"],
                  "nameOrTrait": [{ "tokens": ["Pulsemon"], "match": "name" }]
                }
              },
              {
                "kind": "youHave",
                "filter": {
                  "zone": "digivolutionCards",
                  "controllerDefault": "mine",
                  "nameOrTrait": [{ "tokens": ["Pulsemon"], "match": "name" }]
                }
              }
            ]
          }
        }
      ]
    },
    {
      "trigger": "Main",
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
          "amount": -12000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "securityAtLeast",
            "value": 3
          }
        },
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "opponent",
          "source": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "toTop": true,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "security",
            "op": "lte",
            "value": 3,
            "raw": "you have 3 or fewer security cards"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-101", compiled);
