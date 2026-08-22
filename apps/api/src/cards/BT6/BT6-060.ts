// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": ["Digimon"],
                "nameOrTrait": [{"tokens": ["Three Musketeers", "ThreeMusketeers"], "match": "trait"}]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": ["Option"],
                "playCostOneOf": [7]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Digivolve",
          "target": {"filter": {"isSelfRef": true}, "count": 1, "isSelf": true},
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [{"tokens": ["Three Musketeers", "ThreeMusketeers"], "match": "trait"}]
          },
          "payCost": true,
          "from": ["hand"],
          "costOverride": 6,
          "ignoreRequirements": true,
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT6-060", compiled);
