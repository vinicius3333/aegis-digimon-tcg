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
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainTriggeredEffect",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "gainedTrigger": "OnDeletion",
          "gainedActions": [
            {
              "kind": "GainMemory",
              "amount": -1
            }
          ],
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainTriggeredEffect",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "gainedTrigger": "OnDeletion",
          "gainedActions": [
            {
              "kind": "GainMemory",
              "amount": -1
            }
          ],
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "effects",
          "filter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Gammamon"
                ],
                "match": "name"
              }
            ]
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "effects",
          "filter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              {
                "tokens": [
                  "Gammamon"
                ],
                "match": "name"
              }
            ]
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-039", compiled);
