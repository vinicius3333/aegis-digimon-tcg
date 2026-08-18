// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Your Turn]: when an effect places a digivolution card under this Digimon,
// may digivolve from hand into a Digimon with [X-Antibody] trait, paying cost minus 1.
// The cost reduction "with this effect" is scoped to this digivolve by costDelta: -1
// on the Digivolve action directly (no separate Replacement needed).
// KB Q1748: digivolution requirements cannot be ignored.
// [Inherited][Opponent's Turn]: host gets <Reboot> while [X-Antibody] is in digivolution stack
// (Hisyaryumon has [X-Antibody] so the condition is met whenever this is inherited).
// selfDigivolutionStackHasTrait checks the host's digivolution
// stack for the [X-Antibody] trait (the whole stack, including Hisyaryumon itself).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "filter": {
                  "controllerDefault": "mine",
                  "zone": "hand",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "X-Antibody"
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
              "payCost": true,
              "costDelta": -1,
              "ignoreReqs": false,
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Reboot",
              "raw": "＜Reboot＞"
            }
          },
          "while": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "X-Antibody"
                  ],
                  "match": "trait"
                }
              ]
            }
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-066", compiled);
