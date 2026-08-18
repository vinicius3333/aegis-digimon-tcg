// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST16-08 Garurumon
// [Security] Play 1 [Gabumon] OR 1 Tamer with [Matt Ishida] in name from hand or trash free.
// KB Q823: only exact name [Gabumon] qualifies; not [Gabumon - Bond of Friendship] etc.
// [When Digivolving] <Draw 1>, then trash 1 from hand.
// (inherited) [When Attacking][Once Per Turn] <Draw 1>, then trash 1 from hand.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Gabumon"
                      ],
                      "match": "nameExact"
                    }
                  ]
            },
            "orFilters": [
              {
                  "controller": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Matt Ishida"
                      ],
                      "match": "name"
                    }
                  ]
              }
            ],
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "hand"
            },
            "count": 1
          }
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
      "level": 3,
      "names": [
        "Gabumon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST16-08", compiled);
