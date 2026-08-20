// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "mode": "prevent",
          "sourceFilter": {
            "controller": "mine",
            "excludeSelf": true,
            "kind": ["Digimon"]
          },
          "leaveCause": "byOpponentEffect",
          "affectsAll": true,
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            "raw": "by deleting this Digimon"
          },
          "raw": "＜Guard＞ (When any of your other Digimon would leave the battle area by your opponent's effects, by deleting this Digimon, they don't leave.)"
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
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "SW"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Alliance",
            "raw": "＜Alliance＞"
          },
          "duration": "forTheTurn"
        }
      ]
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
            "count": 1
          },
          "amount": 1
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "excludeSelf": true,
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "SW"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Alliance",
            "raw": "＜Alliance＞"
          },
          "duration": "forTheTurn"
        }
      ]
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
      "traits": [
        "Shambala"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ],
  "digiXrosRequirement": [
    {
      "materials": [
        {
          "names": [
            "Gokuumon"
          ],
          "traits": [
            "SW"
          ],
          "texts": [
            "Gokuumon"
          ]
        }
      ],
      "count": 2
    }
  ]
};

registerIrCard("EX12-056", compiled);
