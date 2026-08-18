// HAND-FIXED — preserve: conditional When Digivolving Blitz lasts for the turn.
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
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        },
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "condition": {
            "kind": "selfDigivolutionStackHasColor",
            "filter": {
              "colors": ["Black"]
            }
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Blitz",
            "raw": "＜Blitz＞"
          },
          "duration": "forTheTurn",
          "condition": {
            "kind": "selfDigivolutionStackHasColor",
            "filter": {
              "colors": ["Red"]
            }
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "BlackWarGreymon",
        "Greymon"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT9-068", compiled);
