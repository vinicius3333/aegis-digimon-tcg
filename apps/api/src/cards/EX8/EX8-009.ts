// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
                    "tokens": [
                      "Growlmon",
                      "Gallantmon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "X Antibody"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
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
                    "tokens": [
                      "Growlmon",
                      "Gallantmon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "X Antibody"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
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
              "amount": 1
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Gigimon",
        "Guilmon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-009", compiled);
