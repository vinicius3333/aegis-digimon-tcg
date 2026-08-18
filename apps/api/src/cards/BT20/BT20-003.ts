// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Pulsemon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "SoC",
                    "SEEKERS"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "underFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon",
              "Tamer"
            ]
          },
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT20-003", compiled);
