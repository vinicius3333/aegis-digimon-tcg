// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Omnimon"
                  ],
                  "match": "name"
                }
              ]
            },
            "count": 1,
            "bindAs": "omnimonSelected"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Return",
          "target": {
            "fromSelectionRef": "omnimonSelected",
            "filter": {},
            "count": 1
          },
          "to": "hand"
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controllerDefault": "any",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": "all"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT5-110", compiled);
