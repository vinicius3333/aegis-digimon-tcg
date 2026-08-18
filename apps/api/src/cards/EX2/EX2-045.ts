// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// When you would play this card from your hand, reduce its play cost by 2 if you have
//   [Guilmon], [Terriermon], [Renamon], or [Impmon] in play.
// [Your Turn] This Digimon can't attack.
// [Your Turn] When one of your Digimon digivolves, you may suspend this Digimon to gain
//   1 memory, <Draw 1>, and have 1 of your Digimon get +3000 DP for the turn.
//   (KB Q3465: Calumon is Lv.- so "same level" checks won't match it for opponent effects.)
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
          "condition": {
            "kind": "youHave",
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Guilmon", "Terriermon", "Renamon", "Impmon"],
                  "match": "nameExact"
                }
              ]
            },
            "raw": "you have [Guilmon], [Terriermon], [Renamon], or [Impmon] in play"
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 2,
              "raw": "reduce its play cost by 2"
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attack",
          "duration": "permanent"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"]
          },
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
          },
          "optional": true,
          "raw": "When one of your Digimon digivolves, you may suspend this Digimon",
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1
            },
            {
              "kind": "Draw",
              "amount": 1
            },
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": 3000,
              "duration": "forTheTurn"
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-045", compiled);
