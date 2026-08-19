// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Link",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "hasLinkRequirement": true,
              "nameOrTrait": [
                {
                  "tokens": [
                    "Social",
                    "Tool",
                    "Game"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand",
            "digivolutionCards"
          ],
          "costDelta": -1,
          "optional": true
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinked",
          "actions": [
            {
              "kind": "PlayWithoutCost",
              "target": {
                "filter": {
                  "controller": "mine",
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Kazuki & Itsuki"
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
              "condition": {
                "kind": "permanentCount",
                "seat": "mine",
                "filter": {
                  "controller": "mine",
                  "kind": ["Tamer"]
                },
                "op": "lte",
                "value": 1,
                "raw": "you have 1 or fewer Tamers"
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
  "residual": [],
  "appFusionRequirement": [
    {
      "names": [
        "Onmon",
        "Gatchmon"
      ],
      "cost": 0
    }
  ]
};

registerIrCard("BT25-052", compiled);
