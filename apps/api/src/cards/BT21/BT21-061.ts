// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR correction: the Your Turn effect's "then" attack belongs inside
// each play/digivolve watcher and remains optional even when the [ADVENTURE] gate fails.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "unit": "colors"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "scaling": {
            "per": 2,
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ]
            },
            "unit": "colors"
          }
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
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Alliance",
                "raw": "＜Alliance＞"
              },
              "duration": "forTheTurn",
              "condition": {
                "kind": "triggerSubjectMatchesFilter",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "ADVENTURE"
                      ],
                      "match": "trait"
                    }
                  ]
                }
              }
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "withoutSuspending": false,
              "optional": true
            }
          ],
          "raw": "whenPlayed"
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "GainKeyword",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Alliance",
                "raw": "＜Alliance＞"
              },
              "duration": "forTheTurn",
              "condition": {
                "kind": "triggerSubjectMatchesFilter",
                "filter": {
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "ADVENTURE"
                      ],
                      "match": "trait"
                    }
                  ]
                }
              }
            },
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "withoutSuspending": false,
              "optional": true
            }
          ],
          "raw": "whenDigivolving"
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Alliance"
          },
          "duration": "permanent"
        }
      ],
      "isInherited": true,
      "keywords": []
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Greymon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "traits": [
        "ADVENTURE"
      ],
      "cost": 3,
      "isAlternate": true,
      "level": 4
    }
  ]
};

registerIrCard("BT21-061", compiled);
