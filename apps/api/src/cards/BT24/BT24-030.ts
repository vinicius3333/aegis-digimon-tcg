// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 5,
              "raw": "reduce the play cost by 5",
              "condition": {
                "kind": "opponentHas",
                "filter": {
                  "controllerDefault": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 2,
                "raw": "your opponent has 2 or more Digimon"
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "superlative": "fewestDigivolutionCards"
            },
            "count": "all"
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "superlative": "fewestDigivolutionCards"
            },
            "count": "all"
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["TS"],
                "match": "trait"
              },
              {
                "tokens": ["Aqua", "Sea Animal"],
                "match": "trait"
              }
            ]
          },
          "triggerCondition": "byOpponentEffect",
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldLeavePlay",
              "mode": "prevent",
              "raw": "they don't leave"
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Digimon"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": ["Aqua"],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": ["Sea Animal"],
      "cost": 3,
      "isAlternate": true,
      "level": 5
    },
    {
      "traits": ["TS"],
      "cost": 3,
      "isAlternate": true,
      "level": 5
    }
  ]
};

registerIrCard("BT24-030", compiled);
