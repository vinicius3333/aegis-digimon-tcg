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
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Demon",
                      "Shaman"
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
                      "Titan"
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
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenHandTrashed",
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Demon",
                        "Titan"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "into": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Titamon"
                    ],
                    "match": "name"
                  },
                  {
                    "tokens": [
                      "Titan"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "from": [
                "trash"
              ],
              "reduceCost": 1,
              "optional": true
            }
          ]
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
        "Tsunomon"
      ],
      "cost": 0,
      "isAlternate": true
    },
    {
      "level": 2,
      "traits": [
        "TS"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-021", compiled);
