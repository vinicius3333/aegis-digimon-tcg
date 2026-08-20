// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX7-060 Nidhoggmon
// [Trash] [Main] If you have 4 or fewer cards in your hand, you may play this card from your
//   trash with the play cost reduced by 4.
// <Blocker>
// [On Deletion] You may play 1 level 5 or lower Digimon card with the [Dark Dragon]/
//   [Evil Dragon] trait from your trash without paying the cost.
// Note: The "trait trait" duplicate in effectText is a typo; card has a single trait filter.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "from": [
            "trash"
          ],
          "payCost": true,
          "reduceCostBy": 4,
          "condition": {
            "kind": "zoneCount",
            "seat": "mine",
            "zone": "hand",
            "op": "lte",
            "value": 4,
            "raw": "you have 4 or fewer cards in your hand"
          },
          "optional": true
        }
      ],
      "isFromTrash": true
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
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
              "kind": [
                "Digimon"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              },
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Dragon",
                    "Evil Dragon"
                  ],
                  "match": "trait"
                }
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
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX7-060", compiled);
