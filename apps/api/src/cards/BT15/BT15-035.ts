// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "<Security Attack -1>"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "hand",
                "nameOrTrait": [
                  { "tokens": ["Numemon"], "match": "name" },
                  { "tokens": ["Sukamon"], "match": "name" }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with [Numemon]/[Sukamon] in its name in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "<Security Attack -1>"
          },
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "hand",
                "nameOrTrait": [
                  { "tokens": ["Numemon"], "match": "name" },
                  { "tokens": ["Sukamon"], "match": "name" }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with [Numemon]/[Sukamon] in its name in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "grant": "name",
          "tokens": ["Numemon"]
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "<Security Attack -1>"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT15-035", compiled);
