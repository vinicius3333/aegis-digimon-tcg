// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-060 Chaosdramon — hand-fixed override (not auto-generated).
// <Piercing> <Security Attack +1> <Fragment (2)> <Engage>
// [OnPlay/WhenDigivolving/WhenAttacking][Once Per Turn] De-Digivolve all opponent Digimon by 2,
//   then delete up to 2 with play cost 0 or less (scaling by own digivolution cards),
//   by placing 2 Lv.5 or lower [Machine]/[Cyborg]/[ME] trait cards from hand/trash as bottom digi-cards.
// <Engage> = [End of Your Turn] this Digimon may attack (optional self-attack at EndOfYourTurn).
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
          "keyword": "Fragment",
          "amount": 2,
          "raw": "＜Fragment (2)＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Engage",
          "raw": "＜Engage＞"
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "Attack",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true
        }
      ]
    },
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
            "count": "all"
          },
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 0,
              "playCostLteScaling": {
                "per": 1,
                "filter": {},
                "unit": "digivolutionCards"
              }
            },
            "count": 2
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "ME"
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
            "raw": "by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards"
          }
        }
      ],
      "frequency": "OncePerTurn"
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
            "count": "all"
          },
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 0,
              "playCostLteScaling": {
                "per": 1,
                "filter": {},
                "unit": "digivolutionCards"
              }
            },
            "count": 2
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "ME"
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
            "raw": "by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards"
          }
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "WhenAttacking",
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
            "count": "all"
          },
          "amount": 2
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "playCostLte": 0,
              "playCostLteScaling": {
                "per": 1,
                "filter": {},
                "unit": "digivolutionCards"
              }
            },
            "count": 2
          },
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "levelComparison": {
                  "op": "lte",
                  "value": 5
                },
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine",
                      "Cyborg",
                      "ME"
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
            "raw": "by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX12-060", compiled);
