// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
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
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand",
              "orTo": "placeUnder"
            }
          ],
          "rest": "deckTopOrBottom",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 [Mineral]/[Rock] trait from any of your Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand",
              "orTo": "placeUnder"
            }
          ],
          "rest": "deckTopOrBottom",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": ["Mineral", "Rock"],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 [Mineral]/[Rock] trait from any of your Digimon's digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "hostFilter": {
            "controller": "mine",
            "nameOrTrait": [
              {
                "tokens": ["Mineral", "Rock"],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "DeDigivolve",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": ["Digimon"]
                },
                "count": 1
              },
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-167", compiled);
