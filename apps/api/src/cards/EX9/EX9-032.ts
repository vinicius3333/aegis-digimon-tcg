// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Cost for both OnPlay/WhenDigivolving and AllTurns Replacement: "1 of your Tokens
// or other [Puppet] trait Digimon" — uses or-filter with isToken:true.
// Replacement is prevent mode with leaveCause:otherThanYourEffect.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
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
                  "Puppet"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "or": [
                  {
                    "isToken": true
                  },
                  {
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Puppet"
                        ],
                        "match": "trait"
                      }
                    ]
                  }
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your Tokens or other [Puppet] trait Digimon"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
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
                  "Puppet"
                ],
                "match": "trait"
              }
            ]
          },
          "payCost": false,
          "from": [
            "hand"
          ],
          "optional": true,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "or": [
                  {
                    "isToken": true
                  },
                  {
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Puppet"
                        ],
                        "match": "trait"
                      }
                    ]
                  }
                ]
              },
              "count": 1
            },
            "raw": "By deleting 1 of your Tokens or other [Puppet] trait Digimon"
          },
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "mode": "prevent",
          "leaveCause": "otherThanYourEffect",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [],
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "excludeSelf": true,
                "or": [
                  {
                    "isToken": true
                  },
                  {
                    "kind": [
                      "Digimon"
                    ],
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Puppet"
                        ],
                        "match": "trait"
                      }
                    ]
                  }
                ]
              },
              "count": 1
            },
            "raw": "by deleting 1 of your Tokens or other [Puppet] trait Digimon, prevent it from leaving"
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
      "level": 4,
      "traits": [
        "Puppet"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX9-032", compiled);
