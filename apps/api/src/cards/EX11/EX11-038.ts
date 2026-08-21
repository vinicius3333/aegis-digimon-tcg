// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5865: the trash cost can target a digivolution card from any of your Digimon's stacks.
// [When Moving][On Play] trash cost: from hand OR digivolutionCards (any card with
//   Mineral/Rock trait in either zone). No kind restriction — hand cards with those
//   traits aren't limited to Digimon kind (could be Option/Tamer).
// Inherited: whenTrashedFromDigivolutionCards sourceFilter restricts to host Digimon
//   with Mineral or Rock trait (the Digimon whose digivolution stack this card was in).
const compiled: CompiledCard = {
  "digivolutionRequirement": [
    { "level": 2, "cost": 0, "isAlternate": true }
  ],
  "effects": [
    {
      "trigger": "WhenMoving",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Mineral",
                      "Rock"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "hand",
                "digivolutionCards"
              ],
              "count": 1
            },
            "raw": "By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Mineral",
                      "Rock"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "hand",
                "digivolutionCards"
              ],
              "count": 1
            },
            "raw": "By trashing 1 [Mineral] or [Rock] trait card from your hand or your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardDiscarded",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Mineral",
                  "Rock"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
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

registerIrCard("EX11-038", compiled);
