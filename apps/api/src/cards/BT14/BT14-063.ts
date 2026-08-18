// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Deletion]: reveal top 3, add 1 [Monzaemon] to hand AND play 1 [Numemon] Digimon without cost.
// KB Q2434: if only one kind found, do that one. KB Q2435: if both found, must do both.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDeletion",
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
                      "Monzaemon"
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
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Numemon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "play",
              "payCost": false
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Numemon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT14-063", compiled);
