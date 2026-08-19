// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
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
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "hasLinkRequirement": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Social",
                    "Tool",
                    "Game"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash",
            "digivolutionCards"
          ],
          "costDelta": -2,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "hasLinkRequirement": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Social",
                    "Tool",
                    "Game"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash",
            "digivolutionCards"
          ],
          "costDelta": -2,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "hasLinkRequirement": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Social",
                    "Tool",
                    "Game"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "trash",
            "digivolutionCards"
          ],
          "costDelta": -2,
          "condition": {
            "kind": "isYourTurn",
            "raw": "it's your turn"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinked",
          "actions": [
            {
              "kind": "Restrict",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon",
                    "Tamer"
                  ]
                },
                "count": 1
              },
              "restriction": "digivolve",
              "duration": "untilOpponentTurnEnd"
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
        "Logamon",
        "Timemon"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("BT25-072", compiled);
