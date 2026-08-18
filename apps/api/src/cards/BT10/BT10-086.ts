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
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "superlative": "highestLevel"
            },
            "count": "all"
          },
          "to": "deckBottom"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "source": "reveal",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "digivolutionCards",
                "or": [
                  {
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "X Antibody"
                        ],
                        "match": "nameExact"
                      }
                    ]
                  },
                  {
                    "levels": [
                      6
                    ]
                  }
                ],
                "controllerDefault": "mine"
              },
              "count": 1,
              "from": ["digivolutionCards"]
            },
            "to": "deckBottom",
            "raw": "By placing 1 [X Antibody] or level 6 card from this Digimon's digivolution cards at the bottom of its owner's deck"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addBottom",
          "controller": "opponent",
          "source": "rest"
        },
        {
          "kind": "SecurityManipulation",
          "op": "shuffle",
          "controller": "opponent"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "source": "reveal",
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "zone": "digivolutionCards",
                "or": [
                  {
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "X Antibody"
                        ],
                        "match": "nameExact"
                      }
                    ]
                  },
                  {
                    "levels": [
                      6
                    ]
                  }
                ],
                "controllerDefault": "mine"
              },
              "count": 1,
              "from": ["digivolutionCards"]
            },
            "to": "deckBottom",
            "raw": "By placing 1 [X Antibody] or level 6 card from this Digimon's digivolution cards at the bottom of its owner's deck"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addBottom",
          "controller": "opponent",
          "source": "rest"
        },
        {
          "kind": "SecurityManipulation",
          "op": "shuffle",
          "controller": "opponent"
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Omnimon",
        "X Antibody"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT10-086", compiled);
