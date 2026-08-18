// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldBePlayed",
          "sourceFilter": {
            "isSelfRef": true
          },
          "actions": [],
          "cost": {
            "kind": "deleteOwn",
            "target": {
              "filter": {
                "controller": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Myotismon"
                    ],
                    "match": "text"
                  }
                ]
              },
              "count": 1
            },
            "raw": "by deleting 1 of your Digimon with [Myotismon] in its text, reduce the play cost by 4",
            "reduceCostBy": 4
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Purple"
              ]
            },
            "count": 1
          },
          "keywords": [
            {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            },
            {
              "keyword": "Retaliation",
              "raw": "＜Retaliation＞"
            }
          ],
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Purple"
              ]
            },
            "count": 1
          },
          "keywords": [
            {
              "keyword": "Blocker",
              "raw": "＜Blocker＞"
            },
            {
              "keyword": "Retaliation",
              "raw": "＜Retaliation＞"
            }
          ],
          "duration": "untilOpponentTurnEnd"
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
                "Tamer"
              ],
              "colors": [
                "Purple"
              ]
            },
            "count": 1
          },
          "from": [
            "trash"
          ],
          "payCost": false,
          "suspended": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-048", compiled);
