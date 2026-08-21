// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": { "filter": { "controller": "opponent", "kind": ["Digimon", "Tamer"], "digivolutionCards": "hasAny" }, "count": 1 },
          "amount": 1,
          "choose": true,
          "cost": { "kind": "trash", "target": { "filter": { "zone": "hand", "controller": "mine", "colors": ["Blue"] }, "count": 1 }, "raw": "by trashing 1 blue card in your hand" },
          "optional": true,
          "abortOnDecline": false
        },
        {
          "kind": "TrashDigivolution",
          "target": { "filter": { "controller": "opponent", "kind": ["Digimon", "Tamer"], "digivolutionCards": "hasAny" }, "count": 1 },
          "amount": 1,
          "choose": true,
          "cost": { "kind": "trash", "target": { "filter": { "zone": "hand", "controller": "mine", "colors": ["Blue"] }, "count": 1 }, "raw": "by trashing a second blue card in your hand" },
          "optional": true,
          "abortOnDecline": false
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "digivolutionCards": "none"
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jellymon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 3
            },
            "raw": "By returning 3 cards with [Jellymon] in their texts from your trash to the bottom of the deck in any order"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("RB1-014", compiled);
