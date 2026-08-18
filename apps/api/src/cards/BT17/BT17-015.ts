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
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 3,
              "raw": "reduce the play cost by 3",
              "condition": {
                "kind": "youHave",
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Tamer"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Tai Kamiya"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "raw": "you have a Tamer with [Tai Kamiya] in its name"
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "Delete",
                "target": {
                  "filter": {
                    "controller": "opponent",
                    "kind": [
                      "Digimon"
                    ],
                    "dp": {
                      "op": "lte",
                      "value": 8000
                    }
                  },
                  "count": 1
                }
              }
            ],
            [
              {
                "kind": "Digivolve",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Gabumon"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1
                },
                "into": {
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "MetalGarurumon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "payCost": false,
                "from": [
                  "hand"
                ],
                "ignoreRequirements": true,
                "optional": true
              }
            ]
          ]
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "Delete",
                "target": {
                  "filter": {
                    "controller": "opponent",
                    "kind": [
                      "Digimon"
                    ],
                    "dp": {
                      "op": "lte",
                      "value": 8000
                    }
                  },
                  "count": 1
                }
              }
            ],
            [
              {
                "kind": "Digivolve",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Gabumon"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1
                },
                "into": {
                  "controllerDefault": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "MetalGarurumon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "payCost": false,
                "from": [
                  "hand"
                ],
                "ignoreRequirements": true,
                "optional": true
              }
            ]
          ]
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "raw",
            "raw": "this Digimon has [Omnimon] in its name"
          }
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
      "level": 5,
      "names": [
        "Greymon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT17-015", compiled);
