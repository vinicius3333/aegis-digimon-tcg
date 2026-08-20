// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "controllerDefault": "mine"
            },
            "orFilters": [
              { "kind": ["Tamer"], "colors": ["Yellow"] },
              { "kind": ["Option"], "singleColor": true, "playCostLte": 5 }
            ],
            "count": 1
          },
          "from": [
            "hand"
          ],
          "toTop": true,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": {
              "controllerDefault": "mine"
            },
            "orFilters": [
              { "kind": ["Tamer"], "colors": ["Yellow"] },
              { "kind": ["Option"], "singleColor": true, "playCostLte": 5 }
            ],
            "count": 1
          },
          "from": [
            "hand"
          ],
          "toTop": true,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOptionUsed",
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": -6000,
              "duration": "forTheTurn"
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenAddSecurity",
          "fireCondition": {
            "kind": "triggerSecurityIsYours"
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": -6000,
              "duration": "forTheTurn"
            }
          ]
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
        "Sakuyamon"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

registerIrCard("LM-023", compiled);
