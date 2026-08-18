// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns]: This is a SubTrigger replacement — when any of your [Dinobeemon]/[Paildramon]
// WOULD BE returned to hands or decks (a wouldLeave event with destination hand/deck),
// 2 of your Digimon MAY DNA digivolve into [Imperialdramon: Dragon Mode] in hand.
// KB Q4400: the DNA digivolved result is a different Digimon, so the leave effect is
// effectively replaced (or the DNA digivolve happens in response).
// The "in the hand" specifies where the target card is sourced from for the DNA digivolve.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                { "tokens": ["Imperialdramon"], "match": "name" },
                { "tokens": ["Free"], "match": "trait" }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
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
              "zone": "trash",
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                { "tokens": ["Imperialdramon"], "match": "name" },
                { "tokens": ["Free"], "match": "trait" }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "wouldBeReturned",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              { "tokens": ["Dinobeemon", "Paildramon"], "match": "name" }
            ],
            "returnDestination": ["hand", "deck"]
          },
          "actions": [
            {
              "kind": "DnaDigivolve",
              "materials": {
                "filter": {
                  "controller": "mine",
                  "kind": ["Digimon"]
                },
                "count": 2
              },
              "into": {
                "controller": "mine",
                "kind": ["Digimon"],
                "zone": "hand",
                "nameOrTrait": [
                  { "tokens": ["Imperialdramon: Dragon Mode"], "match": "name" }
                ]
              },
              "payCost": true,
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
          "kind": "GrantStatic",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "grant": {
            "kind": "PreventSecurityActivation",
            "cardType": "Option"
          },
          "duration": "forTheTurn"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT20-074", compiled);
