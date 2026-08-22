// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX10-008 (MetalGreymon).
// runtime-effect fixes:
// - [On Play]/[When Digivolving]: text grants BOTH <Collision> AND "[Start of Your Main
//   Phase] This Digimon attacks." — the IR only granted <Collision>. Added a
//   `GainTriggeredEffect` action (BT21-077 pattern) with `sameTarget: true` so it applies
//   to the SAME opponent's Digimon chosen for <Collision>, not an independently re-chosen one.
// - Inherited [Opponent's Turn] condition: replaced the raw, malformed string ("... in its
//   name in its name") with a structured `selfHasNameContaining` condition (BT20-080 pattern).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "keyword": {
            "keyword": "Reboot"
          },
          "duration": "permanent"
        }
      ],
      "keywords": []
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Collision",
            "raw": "＜Collision＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainTriggeredEffect",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "gainedTrigger": "StartOfYourMainPhase",
          "gainedActions": [
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              }
            }
          ],
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "keyword": {
            "keyword": "Collision",
            "raw": "＜Collision＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "GainTriggeredEffect",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "gainedTrigger": "StartOfYourMainPhase",
          "gainedActions": [
            {
              "kind": "Attack",
              "target": {
                "filter": {
                  "isSelfRef": true
                },
                "count": 1,
                "isSelf": true
              }
            }
          ],
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAttackTargetSwitched",
          "actions": [
            {
              "kind": "Trash",
              "target": {
                "filter": {
                  "controller": "opponent"
                },
                "count": 1
              },
              "condition": {
                "kind": "selfHasNameContaining",
                "names": [
                  "Greymon"
                ]
              }
            }
          ],
          "raw": "whenAttackTargetSwitched"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "names": [
        "Greymon"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

export { compiled };

registerIrCard("EX10-008", compiled);
