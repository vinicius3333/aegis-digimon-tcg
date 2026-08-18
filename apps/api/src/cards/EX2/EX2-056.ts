// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3348 (binding): The Replacement intercepts "when [a Digimon] would digivolve into"
// a Gallantmon/Growlmon named card — it fires first and grants <Blitz> even if the
// digivolution later fails.
// Effect 0: [Your Turn] SubTrigger on opponent Digimon deletion — by suspending this
//   Tamer, gain 1 memory. GainMemory is the payoff inside the SubTrigger's actions.
// Effect 1: [Your Turn] Replacement on wouldDigivolve — into filter restricts to
//   Gallantmon or Growlmon named targets; GainKeyword: Blitz, forTheTurn, on the
//   digivolving Digimon (sourceRef). The [When Digivolving] prefix on <Blitz> is the
//   timing scope per card text; the engine represents it as the Digimon having Blitz
//   for the turn (the keyword becomes usable in the WhenDigivolving window).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDeletionOf",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "cost": {
                "kind": "suspend",
                "target": {
                  "filter": {
                    "isSelfRef": true
                  },
                  "count": 1,
                  "isSelf": true
                },
                "raw": "by suspending this Tamer"
              },
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Gallantmon",
                  "Growlmon"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {},
                "sourceRef": "triggerSubject",
                "count": 1
              },
              "keyword": {
                "keyword": "Blitz",
                "raw": "＜Blitz＞"
              },
              "duration": "forTheTurn",
              "raw": "gains [When Digivolving] <Blitz> for the turn"
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-056", compiled);
