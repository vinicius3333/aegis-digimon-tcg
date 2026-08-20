// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 4
              }
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "DnaDigivolve",
              "materials": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 2
              },
              "into": {
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "DS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "payCost": true,
              "optional": true,
              "bindResultAs": "dnaDigivolvedByThisEffect",
              "condition": {
                "kind": "triggerSubjectMatchesFilter",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "DS"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "raw": "any of them have the [DS] trait"
              }
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "boundRef": "dnaDigivolvedByThisEffect"
                },
                "count": 1
              },
              "withoutSuspending": false,
              "optional": true,
              "condition": {
                "kind": "bindingExists",
                "ref": "dnaDigivolvedByThisEffect",
                "raw": "that DNA digivolved Digimon"
              }
            }
          ],
          "raw": "whenPlayed"
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "DnaDigivolve",
              "materials": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 2
              },
              "into": {
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "DS"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "payCost": true,
              "optional": true,
              "bindResultAs": "dnaDigivolvedByThisEffect",
              "condition": {
                "kind": "triggerSubjectMatchesFilter",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "DS"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "raw": "any of them have the [DS] trait"
              }
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "boundRef": "dnaDigivolvedByThisEffect"
                },
                "count": 1
              },
              "withoutSuspending": false,
              "optional": true,
              "condition": {
                "kind": "bindingExists",
                "ref": "dnaDigivolvedByThisEffect",
                "raw": "that DNA digivolved Digimon"
              }
            }
          ],
          "raw": "whenDigivolving"
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "DS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX8-027", compiled);
