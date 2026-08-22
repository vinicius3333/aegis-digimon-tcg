import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-IR override (AUTO-GENERATED header removed so the generator preserves this file). The
// [Main] <Delay> clause is represented by the Modal action below: choose placing from hand or
// trashing a [Four Great Dragons]-trait card, then apply -7000 DP in the chosen branch.
//
// BT16-094 Dragon's Breath — KB authority (node tools/kb/query.mjs card BT16-094): no card-specific
// then (if deleted) offers a bool selection: TRUE => place 1 [Trial of the Four Great Dragons] from
// hand (PlaceDelayOptionCards, root:Hand); FALSE => discard 1 [Four Great Dragons]-trait card. If
// `discarded || selectedCards.Count > 0` (did either), give 1 opponent Digimon -7000 DP for the
// turn. Modeled as the existing Modal action (choose 1) composing PlayWithoutCost / Trash + the
// per-branch ModifyDP tail — no new modal primitive (the chosen branch runs exactly one path, so a
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Four Great Dragons"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "colors": [
                  "Yellow"
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "PlayWithoutCost",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Trial of the Four Great Dragons"
                        ],
                        "match": "name"
                      }
                    ]
                  },
                  "count": 1
                },
                "from": [
                  "hand"
                ],
                "payCost": false,
                "optional": true,
                "raw": "place 1 [Trial of the Four Great Dragons] from your hand in the battle area"
              }
            ],
            [
              {
                "kind": "Trash",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "zone": "hand",
                    "nameOrTrait": [
                      {
                        "tokens": [
                          "Four Great Dragons"
                        ],
                        "match": "trait"
                      }
                    ]
                  },
                  "count": 1
                },
                "raw": "you may trash 1 [Four Great Dragons] trait card in your hand"
              }
            ]
          ],
          "raw": "Place 1 [Trial of the Four Great Dragons] from your hand in the battle area, or you may trash 1 [Four Great Dragons] trait card in your hand."
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -7000,
          "duration": "forTheTurn",
          "condition": {
            "kind": "ifThisEffectActed",
            "raw": "if you did either (placed or trashed), 1 of your opponent's Digimon gets -7000 DP for the turn"
          }
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": -7000,
          "duration": "forTheTurn"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("BT16-094", compiled);
