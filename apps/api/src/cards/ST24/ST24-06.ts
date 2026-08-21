// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST24-06 RizeGreymon
// [Digivolve] [GeoGreymon]/Lv.4 w/[DATA SQUAD] trait: Cost 3
// [On Play] [When Digivolving] [When Attacking] [Once Per Turn]
//   1 of your opponent's Digimon gets -5000 DP for the turn.
//   Then, by trashing 2 bottom face-down cards from under any of your Tamers,
//   you may play or use 1 [DATA SQUAD] trait card with a play or use cost of 5 or less
//   from your hand without paying the cost.
// [Inherited] [All Turns] [Once Per Turn] When this Digimon with [ShineGreymon] in its name
//   or the [DATA SQUAD] trait would leave the battle area,
//   by trashing the bottom face-down card from under any of your Tamers, it doesn't leave.
// Q6211: must trash all 2 required cards (can't partially meet "by" condition)
// Q6212: can trash cards from under multiple Tamers (total 2)
// NOTE: "play or use" encoded as PlayWithoutCost per established convention (BT25-073 is
// identical text, also uses PlayWithoutCost, and Haiku audits it as faithful). The engine
// resolves "play or use" at runtime based on card kind.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -5000,
          "duration": "forTheTurn"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DATA SQUAD"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "faceDown": true,
                "hostFilter": {
                  "kind": [
                    "Tamer"
                  ]
                },
                "position": "bottom"
              },
              "count": 2
            },
            "raw": "by trashing 2 bottom face-down cards from under any of your Tamers"
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
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -5000,
          "duration": "forTheTurn"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DATA SQUAD"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "faceDown": true,
                "hostFilter": {
                  "kind": [
                    "Tamer"
                  ]
                },
                "position": "bottom"
              },
              "count": 2
            },
            "raw": "by trashing 2 bottom face-down cards from under any of your Tamers"
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
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -5000,
          "duration": "forTheTurn"
        },
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "DATA SQUAD"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 5
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "faceDown": true,
                "hostFilter": {
                  "kind": [
                    "Tamer"
                  ]
                },
                "position": "bottom"
              },
              "count": 2
            },
            "raw": "by trashing 2 bottom face-down cards from under any of your Tamers"
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
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "mode": "prevent",
          "sourceFilter": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "ShineGreymon"
                ],
                "match": "name"
              },
              {
                "tokens": [
                  "DATA SQUAD"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [],
          "optional": true,
          "abortOnDecline": true,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "faceDown": true,
                "hostFilter": {
                  "kind": [
                    "Tamer"
                  ]
                },
                "position": "bottom"
              },
              "count": 1
            },
            "raw": "by trashing the bottom face-down card from under any of your Tamers, it doesn't leave"
          },
          "raw": "it doesn't leave"
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
        "GeoGreymon"
      ],
      "cost": 3,
      "isAlternate": true
    },
    {
      "level": 4,
      "traits": [
        "DATA SQUAD"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST24-06", compiled);
