// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4196: <Delay> effect cannot ignore digivolution requirements.
// KB Q4197: cannot burst/DNA digivolve via this effect.
// KB Q4199: player can activate Delay but choose not to digivolve (optional).
const compiled: CompiledCard = {
  "effects": [
    {
      // [Main] Reveal top 2, add 1 yellow card to hand, rest to deck bottom. Then place self in battle area.
      "trigger": "Main",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 2,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "colors": ["Yellow"]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      // [Main] <Delay>: 1 of your Digimon may digivolve into a yellow Digimon card in your
      // hand for its digivolution cost. When it would digivolve by this effect, reduce cost by 2.
      "trigger": "Main",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "colors": ["Yellow"],
            "zone": "hand"
          },
          "from": ["hand"],
          "payCost": true,
          "costReduction": 2,
          "optional": true
        }
      ],
      "keywords": [
        { "keyword": "Delay", "raw": "＜Delay＞" }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        { "kind": "PlaceInBattleAreaSelf" }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-105", compiled);
