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
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gammamon"
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
                      "Hiro Amanokawa"
                    ],
                    "match": "name"
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
    },
    {
      "trigger": "YourTurn",
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
            "kind": "modifyDP",
            "amount": 2000
          },
          "while": {
            "kind": "selfTopHasText", "filter": {"nameOrTrait": [{"tokens": ["Gammamon"], "match": "text"}]},
            "raw": "this Digimon has [Gammamon] in its text"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("RB1-005", compiled);
