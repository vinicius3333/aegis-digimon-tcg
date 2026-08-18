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
              "amount": 5,
              "raw": "reduce the play cost by 5",
              "condition": {
                "kind": "youHave",
                "filter": {
                  "controllerDefault": "mine",
                  "kind": [
                    "Digimon",
                    "Tamer"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Iliad"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "raw": "you have an [Iliad] trait Digimon or Tamer"
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
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "playCostLte": 5,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Iliad"
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
          "payCost": false,
          "optional": true
        },
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "optional": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
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
              "playCostLte": 5,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Iliad"
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
          "payCost": false,
          "optional": true
        },
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "optional": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "playCostLte": 5,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Iliad"
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
          "payCost": false,
          "optional": true
        },
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "optional": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "unit": "cards"
          }
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
                    "Iliad"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Reboot",
            "raw": "＜Reboot＞"
          },
          "duration": "permanent"
        },
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
                    "Iliad"
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
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 5,
      "traits": [
        "Beastkin",
        "Dark Dragon",
        "TS"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT24-041", compiled);
