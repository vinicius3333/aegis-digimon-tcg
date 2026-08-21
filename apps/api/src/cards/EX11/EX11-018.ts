// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Evade",
          "raw": "＜Evade＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Decode",
          "raw": "＜Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait)＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
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
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
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
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine",
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
              "from": [
                "hand"
              ]
            },
            "raw": "By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "self"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "onAddDigivolutionCards",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Return",
              "target": {
                "filter": {
                  "digivolutionCardsCompareToSource": "lte",
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "to": "deckBottom"
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX11-018", compiled);
