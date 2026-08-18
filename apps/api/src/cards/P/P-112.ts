// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play]: Reveal top 3 of deck. Add 1 [Eosmon] and 1 [Menoa Bellucci] among them to hand.
// KB Q4216: can add just 1 if only one type revealed.
// KB Q4217: MUST add as many as possible — if both revealed, must add both.
// The two add entries (each count:1) model the mandatory-max behavior correctly.
// Then, by placing this Digimon as 1 of your [Eosmon]'s bottom digivolution card,
// you may play 1 [Menoa Bellucci] from hand without cost.
// Inherited [Your Turn]: when another [Eosmon] is played, this Digimon may digivolve
// into [Eosmon] from hand (cost-3). KB Q4218: cannot ignore digivolution requirements.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Eosmon"],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand",
              "mandatory": true
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Menoa Bellucci"],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand",
              "mandatory": true
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Menoa Bellucci"],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": ["hand"],
          "payCost": false,
          "cost": {
            "kind": "place",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "underFilter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": ["Eosmon"],
                  "match": "name"
                }
              ]
            },
            "raw": "by placing this Digimon as 1 of your [Eosmon]'s bottom digivolution card"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "excludeSelf": true,
            "nameOrTrait": [
              {
                "tokens": ["Eosmon"],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": ["Eosmon"],
                    "match": "name"
                  }
                ]
              },
              "from": ["hand"],
              "reduceCost": 3,
              "ignoreRequirements": false,
              "optional": true
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-112", compiled);
