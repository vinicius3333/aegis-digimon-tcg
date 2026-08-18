// @ts-nocheck
// HAND-FIXED IR — "add up to 2" is an optional 0-2 selection.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 5,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Huckmon",
                      "Jesmon"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "Sistermon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 2,
              "to": "hand",
              "optional": true
            }
          ],
          "rest": "deckBottom"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-009", compiled);
