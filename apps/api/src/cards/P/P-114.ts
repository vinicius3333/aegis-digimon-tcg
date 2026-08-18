// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-114 Diaboromon.
// [All Turns][Once Per Turn] When an effect plays another Digimon, you may delete 1 of
// your opponent's Digimon with play cost ≤ (3 + 2 × your Diaboromon count).
// The scalingCap on the Delete target encodes the dynamic maximum per-Diaboromon scaling.
// excludeSelf:true is correct — "another Digimon" means any Digimon except P-114 itself.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "＜Blast Digivolve＞"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayToken",
          "tokens": [
            "Diaboromon"
          ],
          "count": 1,
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "byEffect": true,
          "sourceFilter": {
            "excludeSelf": true,
            "kind": [
              "Digimon"
            ]
          },
          "actions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ],
                  "playCostLte": 3,
                  "playCostLteScaling": {
                    "addPerCount": 2,
                    "filter": {
                      "controller": "mine",
                      "nameOrTrait": [
                        {
                          "tokens": [
                            "Diaboromon"
                          ],
                          "match": "name"
                        }
                      ]
                    }
                  }
                },
                "count": 1
              },
              "optional": true
            }
          ]
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-114", compiled);
