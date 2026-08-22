// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// CAP-H-08: filter field `faceUp: true` on security scaling filter — counts only
// face-up security cards (not all security cards). See CAPABILITIES-BACKLOG.md.
// CAP-H-09: cost kind `flipSecurityFaceDown` — flip the top face-up security card
// face down as a cost. See CAPABILITIES-BACKLOG.md.
const compiled: CompiledCard = {
  "digivolutionRequirement": [
    {
      "level": 4,
      "cost": 4,
      "colors": ["Green", "Black"],
      "isAlternate": true
    },
    {
      "level": 4,
      "traits": ["Royal Base"],
      "cost": 3,
      "isAlternate": true
    }
  ],
  "effects": [
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Base"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "permanent"
        }
      ],
      "isSecurity": true
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "faceUp": true
            },
            "unit": "security"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "faceUp": true
            },
            "unit": "security"
          }
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon",
                "Tamer"
              ]
            },
            "count": 1
          },
          "restriction": "unsuspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "Replacement",
          "event": "wouldLeavePlay",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ],
            "nameOrTrait": [
              {
                "tokens": [
                  "Royal Base"
                ],
                "match": "trait"
              }
            ]
          },
          "actions": [
            {
              "kind": "Prevent",
              "mode": "leavePlay",
              "target": {
                "filter": {
                  "isTriggerSubject": true
                },
                "count": 1
              }
            }
          ],
          "cost": {
            "kind": "flipSecurity",
            "target": {
              "filter": {
                "zone": "security",
                "controller": "mine",
                "position": "top",
                "faceUp": true
              },
              "count": 1
            },
            "raw": "by flipping your top face-up security card face down"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("EX11-031", compiled);
