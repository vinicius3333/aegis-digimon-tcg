// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
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
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        },
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
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
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
          "optional": true,
          "controller": "opponent"
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "opponent",
          "amount": 1,
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        },
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
            "keyword": "Recovery",
            "amount": 1,
            "raw": "＜Recovery +1＞"
          },
          "duration": "permanent",
          "condition": {
            "kind": "ifThisEffectDidNotDelete",
            "raw": "this effect didn't delete"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "isSelfRef": true
          },
          "optional": true,
          "cost": {
            "kind": "return",
            "target": {
              "filter": {
                "or": [
                  {
                    "zone": "digivolutionCards"
                  },
                  {
                    "zone": "trash"
                  }
                ],
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Lucemon"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1
            },
            "destination": "deck",
            "position": "bottom",
            "raw": "by returning 1 [Lucemon] from this Digimon's digivolution cards or from your trash to the bottom of the deck"
          },
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "zone": "trash",
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "or": [
                    {
                      "nameOrTrait": [
                        {
                          "tokens": [
                            "Lucemon: Satan Mode"
                          ],
                          "match": "name"
                        }
                      ]
                    },
                    {
                      "levels": [
                        6
                      ],
                      "nameOrTrait": [
                        {
                          "tokens": [
                            "Seven Great Demon Lords"
                          ],
                          "match": "trait"
                        }
                      ]
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "trash"
              ],
              "payCost": false,
              "optional": true
            }
          ]
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Lucemon"
      ],
      "cost": 6,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX6-054", compiled);
