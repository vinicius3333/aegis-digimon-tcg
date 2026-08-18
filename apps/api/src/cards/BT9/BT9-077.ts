// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1871: this card can't digivolve from trash on its own; the cost reduction
// applies when ANOTHER effect digivolves this Digimon into a card from the trash.
// The Replacement's `into` filter restricts to trash-zone Digimon cards.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
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
          "amount": 3000,
          "duration": "forTheTurn",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Undead",
                      "Dark Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by trashing 1 card with [Undead] or [Dark Animal] in its traits in your hand"
          },
          "optional": true
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
            "isSelfRef": true
          },
          "into": {
            "zone": "trash",
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
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
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-077", compiled);
