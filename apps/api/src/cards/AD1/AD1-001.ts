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
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Greymon",
                    "Garurumon",
                    "Omnimon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "zone": "trash",
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Greymon",
                    "Garurumon",
                    "Omnimon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "to": "hand",
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon",
              "Tamer"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Garurumon",
                  "Tai Kamiya"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Greymon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "payCost": false,
              "from": [
                "hand"
              ],
              "optional": true
            }
          ]
        },
        {
          "kind": "SubTrigger",
          "event": "whenOneOfYoursDigivolves",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon",
              "Tamer"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Garurumon",
                  "Tai Kamiya"
                ],
                "match": "name"
              }
            ]
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "into": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Greymon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "payCost": false,
              "from": [
                "hand"
              ],
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "texts": [
        "Omnimon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "traits": [
        "ADVENTURE"
      ],
      "cost": 2,
      "isAlternate": true,
      "level": 3
    }
  ]
};

registerIrCard("AD1-001", compiled);
