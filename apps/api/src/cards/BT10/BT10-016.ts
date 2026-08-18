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
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    },
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "Sistermon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "amount": 2000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "selfHasInDigivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jesmon"
                    ],
                    "match": "nameExact"
                  }
                ],
                "raw": "[Jesmon] is in this Digimon's digivolution cards"
              },
              {
                "kind": "youHave",
                "filter": {
                  "zone": "battleArea",
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Sistermon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "raw": "you have a Digimon with [Sistermon] in its name in play"
              }
            ],
            "raw": "[Jesmon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play"
          }
        },
        {
          "kind": "GrantCanAttackUnsuspended",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": "all"
          },
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "selfHasInDigivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jesmon"
                    ],
                    "match": "nameExact"
                  }
                ],
                "raw": "[Jesmon] is in this Digimon's digivolution cards"
              },
              {
                "kind": "youHave",
                "filter": {
                  "zone": "battleArea",
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Sistermon"
                      ],
                      "match": "name"
                    }
                  ]
                },
                "raw": "you have a Digimon with [Sistermon] in its name in play"
              }
            ],
            "raw": "[Jesmon] is in this Digimon's digivolution cards or you have a Digimon with [Sistermon] in its name in play"
          }
        },
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "playerScoped": true,
          "duration": "untilOpponentTurnEnd",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "sourceRef": "triggerSubject",
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": 2000,
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "GrantCanAttackUnsuspended",
              "target": {
                "sourceRef": "triggerSubject",
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "duration": "untilOpponentTurnEnd"
            }
          ],
          "condition": {
            "kind": "anyOf",
            "conditions": [
              {
                "kind": "selfHasInDigivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Jesmon"
                    ],
                    "match": "nameExact"
                  }
                ]
              },
              {
                "kind": "youHave",
                "filter": {
                  "zone": "battleArea",
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Sistermon"
                      ],
                      "match": "name"
                    }
                  ]
                }
              }
            ]
          },
          "raw": "Until the end of your opponent's turn, all of your Digimon that are played later get +2000 DP and may also attack unsuspended Digimon."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Jesmon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT10-016", compiled);
