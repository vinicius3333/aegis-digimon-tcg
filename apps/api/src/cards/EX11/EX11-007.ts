// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenMoving",
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
                    "Tyrannomon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Reptile",
                    "Dinosaur"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Raid",
            "raw": "＜Raid＞"
          },
          "duration": "forTheTurn"
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
                    "Tyrannomon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Reptile",
                    "Dinosaur"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "OnPlay",
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
                    "Tyrannomon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Reptile",
                    "Dinosaur"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Raid",
            "raw": "＜Raid＞"
          },
          "duration": "forTheTurn"
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
                    "Tyrannomon"
                  ],
                  "match": "name"
                },
                {
                  "tokens": [
                    "Reptile",
                    "Dinosaur"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Piercing",
            "raw": "＜Piercing＞"
          },
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "AllTurns",
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
          "amount": 1000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Koromon"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("EX11-007", compiled);
