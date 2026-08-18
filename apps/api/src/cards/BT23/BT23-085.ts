// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "StartOfYourMainPhase",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["CS"],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a [CS] trait Digimon"
          }
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Hudie"],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "restriction": "dpImmune",
          "byOpponentEffectsOnly": true,
          "restrictedToOpponentEffects": true,
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Hudie"],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "Reboot",
            "raw": "＜Reboot＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                {
                  "tokens": ["Hudie"],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSuspended",
          "sourceFilter": {
            "controller": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["Hudie"],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "UseOptionWithoutCost",
              "filter": {
                "controller": "mine",
                "kind": ["Option"],
                "nameOrTrait": [
                  {
                    "tokens": ["CS"],
                    "match": "trait"
                  }
                ],
                "singleColor": true
              },
              "payCost": false,
              "from": ["hand"],
              "optional": true
            }
          ],
          "cost": {
            "kind": "suspend",
            "target": {
              "filter": {
                "isSelfRef": true
              },
              "count": 1,
              "isSelf": true
            },
            "raw": "by suspending this Tamer"
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
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "payCost": false
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT23-085", compiled);
