// @ts-nocheck
// HAND-FIXED IR — the watcher only observes opposing Digimon or Tamers being played.
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
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon",
              "Tamer"
            ]
          },
          "actions": [
            {
              "kind": "GainMemory",
              "amount": 1,
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "zone": "digivolutionCards"
                  },
                  "count": 1
                },
                "raw": "by trashing 1 of this Digimon's digivolution cards"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "underFilter": {
            "controller": "mine",
            "kind": [
              "Tamer"
            ]
          },
          "optional": true
        }
      ],
      "keywords": [
        {
          "keyword": "Save",
          "raw": "＜Save＞"
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onDigivolutionCardsDiscardedBatch",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "GainMemory",
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

registerIrCard("BT10-076", compiled);
