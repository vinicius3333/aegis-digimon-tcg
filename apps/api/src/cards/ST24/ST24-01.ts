// @ts-nocheck
// Hand-authored override for ST24-01 (Koromon, DigiEgg).
// Fix: cost "by trashing the bottom face-down card from under any of your Tamers"
// targets a digivolution card beneath a Tamer (zone:"digivolutionCards" +
// hostFilter kind:["Tamer"]), NOT the Tamer permanent itself.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenAttacking",
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
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "DATA SQUAD"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "hand"
          ],
          "reduceCost": 2,
          "optional": true,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "hostFilter": {
                  "kind": ["Tamer"],
                  "controller": "mine"
                },
                "faceDown": true,
                "position": "bottom"
              },
              "count": 1
            },
            "raw": "By trashing the bottom face-down card from under any of your Tamers"
          },
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

registerIrCard("ST24-01", compiled);
