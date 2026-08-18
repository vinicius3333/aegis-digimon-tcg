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
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        },
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Magnamon (X Antibody)"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Armor Form"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "[Magnamon (X Antibody)] or an [Armor Form] trait card is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "GrantImmunity",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "immuneFrom": "opponentEffects",
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "selfDigivolutionStackHasTrait",
            "filter": {
              "nameOrTrait": [
                {
                  "tokens": [
                    "Magnamon (X Antibody)"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Armor Form"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "[Magnamon (X Antibody)] or an [Armor Form] trait card is in this Digimon's digivolution cards"
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "actions": [
            {
              "kind": "ActivateEffect",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              },
              "effectType": "WhenDigivolving",
              "optional": true
            }
          ]
        },
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
            "Free"
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "multicolor": true,
      "names": [
        "Magnamon"
      ],
      "cost": 5,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT16-102", compiled);
