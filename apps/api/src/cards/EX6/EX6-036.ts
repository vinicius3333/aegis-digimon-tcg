// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Tamer",
                  "Option"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Diaboromon"
                    ],
                    "match": "text"
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
                      "Unidentified"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "condition": {
            "kind": "selfHasTrait",
            "filter": { "nameOrTrait": [{ "tokens": ["Unidentified"], "match": "trait" }] },
            "raw": "this Digimon had the [Unidentified] trait"
          },
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX6-036", compiled);
