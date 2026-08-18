// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4292 (binding): this card's [Your Turn] cost-reduction effect does NOT trigger when
// this card is in the breeding area. The sourceFilter restricts to zone:battleArea.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldDigivolve",
          "sourceFilter": {
            "isSelfRef": true,
            "zone": "battleArea"
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Ginryumon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "Chronicle"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldDigivolve",
              "mode": "reduceCost",
              "amount": 1,
              "raw": "reduce the digivolution cost by 1"
            }
          ]
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 2000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 2,
      "colors": [
        "Black"
      ],
      "traits": [
        "X Antibody"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT20-010", compiled);
