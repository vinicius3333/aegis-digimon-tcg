// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          "kind": "Return",
          "target": {
            "filter": {
              "digivolutionCardsCompareToSource": "lte",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
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
              "digivolutionCardsCompareToSource": "lte",
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 2
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
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
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "raw": "you have a Tamer"
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
      "names": [
        "Gabumon"
      ],
      "cost": 3,
      "isAlternate": true,
      "condition": {
        "kind": "securityAtMost",
        "value": 2,
        "raw": "while you have 2 or fewer security cards"
      }
    }
  ]
};

registerIrCard("LM-022", compiled);
