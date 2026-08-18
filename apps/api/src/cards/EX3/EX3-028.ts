// @ts-nocheck
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
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "excludeNameOrTrait": [
                  {
                    "tokens": [
                      "Three Great Angels"
                    ],
                    "match": "trait"
                  }
                ],
                "controllerDefault": "mine",
                "colors": [
                  "Yellow"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Angel",
                      "Cherub",
                      "Throne",
                      "Authority",
                      "Seraph",
                      "Virtue"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Four Great Dragons"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
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

registerIrCard("EX3-028", compiled);
