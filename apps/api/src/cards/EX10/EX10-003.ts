// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "Prevent",
              "cost": {
                "kind": "TrashDigivolution",
                "target": {
                  "filter": {
                    "controllerDefault": "mine",
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
                  "amount": 3
                },
                "raw": "by trashing 3 [Mineral] or [Rock] trait cards from this Digimon's digivolution cards"
              },
              "optional": true,
              "abortOnDecline": true
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

export { compiled };

registerIrCard("EX10-003", compiled);
