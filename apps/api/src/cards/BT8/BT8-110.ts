// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT8-110 (Armor Texture!).
// Errata (2022-05-27): Security effect changed to "you may play..."
// KB Q1789: "If you do, only the Digimon you chose to digivolve will unsuspend."
// KB Q1790: If you choose NOT to digivolve, no Digimon unsuspends.
// KB Q1791: Digivolution requirements cannot be ignored.
//
// Corrections:
// - Digivolve target is stored via bindAs "digivolveTarget" so Unsuspend can reference it.
// - Unsuspend targets the stored selection (fromSelectionRef), not any Digimon.
// - The [Main] Trash carries `topCardOnly`: the printed text is "trash the TOP CARD of 1 of
//   your Digimon with [Armor Form]", which purges that layer and leaves the Digimon in play.
//   The prose compiler emits the same IR for this as for "trash 1 of your Digimon", so the
//   distinction is made here on the card rather than by teaching the compiler a rule that
//   would have to be re-derived for the whole corpus.
// - Unsuspend is NOT optional (mandatory if you digivolved — KB Q1789/Q1790; optionality
//   is on the Digivolve action, not the Unsuspend).
// - Condition on Unsuspend: "if you do" (this effect digivolved).
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
                    "Armor Form"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon with [Armor Form] in its traits in play"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Armor Form"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "topCardOnly": true
          }
        },
        {
          "kind": "Digivolve",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "digivolveTarget"
          },
          "into": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Armor Form"
                ],
                "match": "trait"
              }
            ]
          },
          "from": ["hand"],
          "payCost": true,
          "optional": true
        },
        {
          "kind": "Unsuspend",
          "target": {
            "fromSelectionRef": "digivolveTarget",
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "condition": {
            "kind": "ifThisEffectDigivolved"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "levels": [
                3
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Free"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "trash"
          ],
          "payCost": false,
          "optional": true
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT8-110", compiled);
