// @ts-nocheck
// Hand-fixed IR for LM-042 — faithful to printed text.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "cantActivateWhenDigivolving",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "cantActivateWhenDigivolving",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "placeAsSecurity",
          "controller": "mine",
          "source": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "toTop": false
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": ["Angel", "Archangel"],
      "cost": 3,
      "isAlternate": true
    }
  ]
};
registerIrCard("LM-042", compiled);
