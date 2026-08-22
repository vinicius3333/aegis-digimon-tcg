// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashTopDeck",
          "controller": "mine",
          "amount": 3
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantAuraToOpponents",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effectText": "GRANTEFFECT58TOKEN"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "modifyDP",
            "amount": 2000
          },
          "while": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [{ "tokens": ["Wizard", "Demon Lord"], "match": "trait" }]
            }
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST14-07", compiled);
