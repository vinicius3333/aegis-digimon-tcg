// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1,
            "bindAs": "chosenDigimon"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "fromSelectionRef": "chosenDigimon",
            "count": 1
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "relativeTo": {
                "attr": "dp",
                "op": "lte",
                "selectionRef": "chosenDigimon"
              }
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1,
            "bindAs": "chosenDigimon"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Delete",
          "target": {
            "fromSelectionRef": "chosenDigimon",
            "count": 1
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "relativeTo": {
                "attr": "dp",
                "op": "lte",
                "selectionRef": "chosenDigimon"
              }
            },
            "count": 1
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Veemon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-070", compiled);
