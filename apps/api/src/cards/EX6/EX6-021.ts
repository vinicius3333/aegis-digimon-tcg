// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q&A Q3719: If you don't add the security card to hand (the "by X" cost),
// NEITHER the DP reduction NOR the placement activates. The cost gates the whole effect.
// Encoded as a CostGatedBlock: all actions inside share the same cost — paying it once
// enables both the ModifyDP and the SecurityManipulation.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "CostGatedBlock",
          "cost": {
            "kind": "securityToHand",
            "controller": "mine",
            "position": "topOrBottom",
            "raw": "By adding the top or bottom card of your security stack to the hand"
          },
          "optional": true,
          "abortOnDecline": true,
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
              "amount": -4000,
              "duration": "forTheTurn"
            },
            {
              "kind": "SecurityManipulation",
              "op": "placeAsSecurity",
              "controller": "mine",
              "source": {
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Angel",
                        "Archangel",
                        "Three Great Angels"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "hand"
              ],
              "toTop": false,
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "CostGatedBlock",
          "cost": {
            "kind": "securityToHand",
            "controller": "mine",
            "position": "topOrBottom",
            "raw": "By adding the top or bottom card of your security stack to the hand"
          },
          "optional": true,
          "abortOnDecline": true,
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
              "amount": -4000,
              "duration": "forTheTurn"
            },
            {
              "kind": "SecurityManipulation",
              "op": "placeAsSecurity",
              "controller": "mine",
              "source": {
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Angel",
                        "Archangel",
                        "Three Great Angels"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "from": [
                "hand"
              ],
              "toTop": false,
              "optional": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Rule",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": [
            "Angel"
          ]
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Angel",
                    "Archangel",
                    "Three Great Angels"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "partial",
  "residual": []
};

registerIrCard("EX6-021", compiled);
