// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-077 (Proximamon).
// [On Play][When Digivolving][When Attacking][Counter] PlayWithoutCost:
//   Added playCost ≤ 10 restriction to all 4 effects (text: "play or use cost 10
//   or lower card"). Each effect also applies to Option cards ("play or use"), so
//   the filter must not restrict to Digimon only — no kind filter is correct.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gammamon"
                    ],
                    "match": "text"
                  },
                  {
                    "tokens": [
                      "VB"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 2,
              "from": [
                "hand",
                "trash"
              ]
            },
            "destination": "digivolutionStack",
            "position": "choice",
            "host": "target",
            "underFilter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "raw": "By placing 2 cards with [Gammamon] in their texts or the [VB] trait from your hand or trash as 1 of your Digimon's top or bottom digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Gammamon"
                    ],
                    "match": "text"
                  },
                  {
                    "tokens": [
                      "VB"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 2,
              "from": [
                "hand",
                "trash"
              ]
            },
            "destination": "digivolutionStack",
            "position": "choice",
            "host": "target",
            "underFilter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "raw": "By placing 2 cards with [Gammamon] in their texts or the [VB] trait from your hand or trash as 1 of your Digimon's top or bottom digivolution cards"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "VB"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 10
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "VB"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 10
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "VB"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 10
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "Counter",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Gammamon"
                  ],
                  "match": "text"
                },
                {
                  "tokens": [
                    "VB"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 10
            },
            "count": 1
          },
          "from": [
            "digivolutionCards"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX12-077", compiled);
