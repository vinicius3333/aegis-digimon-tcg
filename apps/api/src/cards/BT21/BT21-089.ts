// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "opponentHas",
            "filter": {
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has a Digimon"
          }
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
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Guilmon",
                        "Growlmon",
                        "Gallantmon",
                        "Megidramon"
                      ],
                      "match": "name"
                    },
                    {
                      "tokens": [
                        "Hero"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Guilmon",
                        "Growlmon",
                        "Gallantmon",
                        "Megidramon"
                      ],
                      "match": "name"
                    },
                    {
                      "tokens": [
                        "Hero"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "amount": 2000,
              "duration": "untilOpponentTurnEnd",
              "condition": {
                "kind": "combinedTrashCount",
                "op": "gte",
                "value": 10,
                "raw": "there are 10 or more total cards in both players' trashes"
              }
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer"
          }
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
                        "Guilmon",
                        "Growlmon",
                        "Gallantmon",
                        "Megidramon"
                      ],
                      "match": "name"
                    },
                    {
                      "tokens": [
                        "Hero"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "keyword": {
                "keyword": "Blocker",
                "raw": "＜Blocker＞"
              },
              "duration": "untilOpponentTurnEnd"
            },
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Guilmon",
                        "Growlmon",
                        "Gallantmon",
                        "Megidramon"
                      ],
                      "match": "name"
                    },
                    {
                      "tokens": [
                        "Hero"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "amount": 2000,
              "duration": "untilOpponentTurnEnd",
              "condition": {
                "kind": "combinedTrashCount",
                "op": "gte",
                "value": 10,
                "raw": "there are 10 or more total cards in both players' trashes"
              }
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT21-089", compiled);
