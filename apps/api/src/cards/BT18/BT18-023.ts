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
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Aqua",
                      "Sea Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand",
              "orDispositions": [
                {
                  "to": "placeUnder",
                  "underFilter": {
                    "controllerDefault": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "colors": [
                      "Blue"
                    ]
                  }
                }
              ]
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
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
                      "Aqua",
                      "Sea Animal"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand",
              "orDispositions": [
                {
                  "to": "placeUnder",
                  "underFilter": {
                    "controllerDefault": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "colors": [
                      "Blue"
                    ]
                  }
                }
              ]
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": [
            "Aquatic"
          ]
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Calmaramon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT18-023", compiled);
