// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX10-031 DarkKnightmon
// Text: [On Play] [When Digivolving] Until your opponent's turn ends, their <De-Digivolve>
// effects don't affect 1 of your Digimon, and it gets +3000 DP.
// Text: [All Turns] [Once Per Turn] When this Digimon would leave the battle area, you may
// play 1 play cost 4 or lower card from its digivolution cards without paying the cost.
// Text: [DigiXros -1] [SkullKnightmon] x [DeadlyAxemon]
// KB Q5090: "w/[Knightmon] in text" includes any card with Knightmon in name/traits/effects.
// Fixes: added GrantStatic deDigivolve protection; added DeadlyAxemon to DigiXros materials;
// added kind filter to PlayWithoutCost target.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "grant": {
            "kind": "Protection",
            "protections": [
              "deDigivolve"
            ],
            "from": "opponent"
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
              ]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "grant": {
            "kind": "Protection",
            "protections": [
              "deDigivolve"
            ],
            "from": "opponent"
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
              ]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
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
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon",
                    "Tamer",
                    "Option"
                  ],
                  "playCostLte": 4
                },
                "count": 1
              },
              "from": [
                "digivolutionCards"
              ],
              "payCost": false,
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenOpponentAttacks",
          "actions": [
            {
              "kind": "RedirectAttack",
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
      "texts": [
        "Knightmon"
      ],
      "cost": 4,
      "isAlternate": true
    }
  ],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "SkullKnightmon"
          ]
        },
        {
          "names": [
            "DeadlyAxemon"
          ]
        }
      ],
      "count": 1
    }
  ]
};

registerIrCard("EX10-031", compiled);
