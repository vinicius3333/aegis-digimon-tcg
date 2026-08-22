// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "RawUnparsed",
          "text": "missing-primitive(unaudited): 1 of your Digimon gains \"[Opponent's Turn] When this Digimon becomes suspended, delete all of your opponent's Digimon with a play cost less than or equal to this Digimon's\" and \"[Opponent's Turn] This Digimon isn't affected by your opponent's Option cards.\""
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
              "superlative": "lowestPlayCost"
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

registerIrCard("BT13-108", compiled);
