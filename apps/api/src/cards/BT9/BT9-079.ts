// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR for BT9-079 (GranDracmon).
//
// Audit fixes:
//
// 1. [End of Attack] target filter must exclude self ("1 of your OTHER Digimon").
//    Prior IR had no excludeSelf. Fix: add excludeSelf: true.
//
// 2. [End of Attack] `into` was a raw string. Fix: use structured filter with
//    nameOrTrait [Undead, Dark Animal] match:"trait" (OR disjunction per BT9-071 pattern).
//
// 3. [End of Attack] freeCost: true was wrong. KB Q1872 says requirements cannot be ignored.
//    The effect pays no memory cost (payCost: false) but MUST satisfy digivolution requirements.
//    Fix: payCost: false, remove freeCost, remove ignoreReqs (not present but make explicit).

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Purple"
              ],
              "levels": [
                3
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
    },
    {
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "excludeSelf": true
            },
            "count": 1
          },
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Undead",
                  "Dark Animal"
                ],
                "match": "trait"
              }
            ]
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "ignoreReqs": false,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-079", compiled);
