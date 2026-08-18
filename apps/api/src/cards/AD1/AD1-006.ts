// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "dp": {
                "op": "lte",
                "relativeToSource": true
              }
            },
            "count": 1
          },
          "to": "deckBottom",
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "optional": true
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
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [
            {
              "kind": "PlaceUnder",
              "target": {
                "filter": {
                  "or": [
                    {
                      "keyword": "Xros Heart"
                    },
                    {
                      "keyword": "Blue Flare"
                    }
                  ],
                  "cardType": "Digimon"
                },
                "count": 4,
                "upTo": true,
                "controller": "mine",
                "zone": "digivolutionCards",
                "source": "thisDigimon"
              },
              "underFilter": {
                "cardType": "Tamer",
                "count": 1,
                "controller": "mine"
              }
            },
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "or": [
                    {
                      "keyword": "Xros Heart"
                    },
                    {
                      "keyword": "Blue Flare"
                    }
                  ],
                  "cardType": "Digimon"
                },
                "count": 1,
                "controller": "mine",
                "zone": "underTamer"
              },
              "payCost": false
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
      "level": 6,
      "traits": [
        "Xros Heart",
        "Blue Flare"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "OmniShoutmon"
          ]
        }
      ],
      "count": 2
    }
  ]
};

registerIrCard("AD1-006", compiled);
