// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "Return",
                "target": {
                  "filter": {
                    "zone": "trash",
                    "controller": "mine",
                    "kind": [
                      "Option"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Plug-In"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1
                },
                "to": "hand"
              }
            ],
            [
              {
                "kind": "Draw",
                "controller": "mine",
                "amount": 2,
                "cost": {
                  "kind": "trash",
                  "target": {
                    "filter": {
                      "zone": "hand",
                      "controller": "mine",
                      "kind": [
                        "Option"
                      ],
                      "nameOrTrait": [
                        {
                          "tokens": [
                            "Plug-In"
                          ],
                          "match": "name"
                        }
                      ]
                    },
                    "count": 1
                  },
                  "raw": "By trashing 1 Option card with [Plug-In] in its name in your hand"
                },
                "optional": true,
                "abortOnDecline": true
              }
            ]
          ],
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-036", compiled);
