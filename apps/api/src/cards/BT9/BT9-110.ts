// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-110 X Program
// "While you have a Digimon with [Dex] or [DeathX] in its name in play, you may use this
//   card without meeting its color requirements."
// "[Main] Delete 1 Digimon without [X Antibody] in its traits. If there are 3 or more
//   Digimon in play, delete all Digimon without [X Antibody] in their traits instead."
// Q1924: "3 or more Digimon in play" = both players' Digimon combined.
// Q1925: when 3+ Digimon in play, you MUST delete all (can't just delete 1).
// "[Security] Delete 1 of your opponent's Digimon without [X Antibody] in its traits."
//
// Fix 1: "Delete 1 Digimon" — any controller (not opponent only).
// Fix 2: "delete all Digimon without [X Antibody]" — any controller (not opponent only).
// Fix 3: The two deletes are mutually exclusive (ConditionalBranch: if 3+ Digimon in play,
//   delete all; otherwise delete 1). Prior IR had both actions firing sequentially.
// Fix 4: Use excludeNameOrTrait for "without [X Antibody] in traits" (prior IR used
//   nameOrTrait which MATCHED cards WITH X Antibody — inverted logic).
// Fix 5: Security effect targets opponent Digimon (text specifies "your opponent's").
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "zone": "battleArea",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dex",
                    "DeathX"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "you have a Digimon with [Dex] or [DeathX] in its name in play"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "ConditionalBranch",
          "condition": {
            "kind": "totalDigimonCount",
            "op": "gte",
            "value": 3,
            "raw": "there are 3 or more Digimon in play (both players' combined)"
          },
          "ifTrue": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "kind": ["Digimon"],
                  "excludeNameOrTrait": [
                    {
                      "tokens": ["X Antibody"],
                      "match": "trait"
                    }
                  ]
                },
                "count": "all"
              }
            }
          ],
          "ifFalse": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "kind": ["Digimon"],
                  "excludeNameOrTrait": [
                    {
                      "tokens": ["X Antibody"],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              }
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "excludeNameOrTrait": [
                {
                  "tokens": ["X Antibody"],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          }
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT9-110", compiled);
