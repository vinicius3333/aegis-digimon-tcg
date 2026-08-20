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
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "ActivateEffect",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "effectType": "WhenDigivolving",
              "inherited": false,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Diaboromon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Jamming",
            "raw": "＜Jamming＞"
          },
          "duration": "permanent"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Diaboromon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};
registerIrCard("EX6-043", compiled);
