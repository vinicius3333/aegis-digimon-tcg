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
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attack",
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Belphemon: Rage Mode"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 [Belphemon: Rage Mode] from your trash as this Digimon's top digivolution card",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GrantImmunity",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "immuneFrom": "opponentEffects",
          "duration": "untilOpponentTurnEnd",
          "optional": false
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "attack",
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "trash",
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Belphemon: Rage Mode"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "from": [
                "trash"
              ]
            },
            "raw": "By placing 1 [Belphemon: Rage Mode] from your trash as this Digimon's top digivolution card",
            "destination": "digivolutionStack",
            "position": "top",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "GrantImmunity",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "immuneFrom": "opponentEffects",
          "duration": "untilOpponentTurnEnd",
          "optional": false
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Suspend",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon",
                    "Tamer"
                  ]
                },
                "count": 2
              },
              "cost": {
                "kind": "trash",
                "target": {
                  "filter": {
                    "zone": "hand",
                    "controller": "mine"
                  },
                  "count": 2
                },
                "raw": "by trashing 2 cards in your hand"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Belphemon: Rage Mode"
      ],
      "cost": 1,
      "isAlternate": true
    }
  ]
};

export { compiled };

registerIrCard("EX10-021", compiled);
