// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 2000,
          "duration": "untilOpponentTurnEnd",
          "cost": {
          "kind": "compound",
          "costs": [
            { "kind": "payMemory", "memory": 1 },
            { "kind": "place", "target": { "filter": { "zone": "hand", "controller": "mine", "kind": ["Option"] }, "count": 1, "from": ["hand"] }, "underFilter": { "controller": "mine", "kind": ["Digimon"], "levels": [3] }, "underOrFilters": [{ "controller": "mine", "kind": ["Digimon"], "nameOrTrait": [{ "tokens": ["Legend-Arms"], "match": "trait" }] }], "destination": "digivolutionStack", "position": "bottom", "host": "target" }
          ],
          "raw": "By paying 1 cost and placing this card as the bottom digivolution card of 1 of your Digimon that's level 3 or has the [Legend-Arms] trait"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isFromHand": true
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "actions": [
            {
              "kind": "Draw",
              "controller": "mine",
              "amount": 1
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OpponentsTurn",
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
      "names": [
        "Kakkinmon",
        "Sakuttomon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX6-038", compiled);
