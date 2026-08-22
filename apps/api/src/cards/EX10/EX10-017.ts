// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": { "controller": "opponent", "kind": ["Digimon"] },
          "actions": [
            {
              "kind": "Draw",
              "amount": 1,
              "controller": "mine",
              "cost": {
                "kind": "trash",
                "target": { "filter": { "controller": "mine", "kind": ["Digimon"], "zone": "linked" }, "count": 1 },
                "raw": "By trashing 1 of this Digimon's link cards"
              },
              "optional": true,
              "abortOnDecline": true
            },
            { "kind": "GainMemory", "amount": 1, "controller": "mine" }
          ]
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Jamming",
          "raw": "＜Jamming＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Retaliation",
          "raw": "＜Retaliation＞"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinked",
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Leviathan"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "hand"
              ],
              "payCost": false,
              "condition": {
                "kind": "youHave",
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ]
                },
                "raw": "you have 1 or fewer Tamers"
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "appFusionRequirement": [
    {
      "names": [
        "Mirrormon",
        "Kabemon",
        "Copipemon"
      ],
      "cost": 0
    }
  ]
};

export { compiled };

registerIrCard("EX10-017", compiled);
