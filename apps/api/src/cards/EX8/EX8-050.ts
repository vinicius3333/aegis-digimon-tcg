// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
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
                "kind": [
                  "Digimon"
                ],
                "playCostLte": 5,
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
              "count": 1,
              "to": "play",
              "optional": true
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "RedirectAttack",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
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

registerIrCard("EX8-050", compiled);
