// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "controllerDefault": "mine"
          },
          "actions": [
            {
              "kind": "Replacement",
              "event": "wouldBePlayed",
              "mode": "reduceCost",
              "amount": 6,
              "raw": "reduce the play cost by 6",
              "cost": {
                "kind": "deleteOwn",
                "target": {
                  "filter": {
                    "controller": "mine",
                    "kind": [
                      "Digimon"
                    ],
                    "levels": [
                      4
                    ]
                  },
                  "count": 1
                },
                "raw": "by deleting 1 of your level 4 Digimon"
              },
              "optional": true,
              "abortOnDecline": true
            }
          ]
        },
        { "kind": "GainKeyword", "target": { "filter": { "isSelfRef": true }, "count": 1, "isSelf": true }, "keyword": { "keyword": "Blocker", "raw": "＜Blocker＞" } },
        { "kind": "PlayWithoutCost", "target": { "filter": { "controller": "mine", "kind": ["Tamer"], "nameOrTrait": [{ "tokens": ["Akihiro Kurata"], "match": "name" }] }, "count": 1 }, "from": ["trash"], "payCost": false, "optional": true }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "restriction": "digivolve",
          "duration": "permanent"
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
              "nameOrTrait": [
                {
                  "tokens": [
                    "ProtoGizmon"
                  ],
                  "match": "name"
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

registerIrCard("BT13-086", compiled);
