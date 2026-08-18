// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-216 WaruMonzaemon
// <Blocker>
// [On Play] Play 1 [Dark Masters] trait Digimon from hand without cost.
//   The Digimon played can't digivolve and is deleted at turn end (opponent's turn end per Q5962).
// [On Deletion] Play 1 face-up [Dark Masters] trait Digimon from security without cost.
//   At the end of your turn, delete the Digimon played. It still can't digivolve even if delete is prevented (Q5962).
// (inherited) <Blocker>
//
// KB Q5962: OnPlay Digimon deleted at END OF OPPONENT'S TURN (deletion timing).
//           OnDeletion Digimon deleted at END OF YOUR TURN.
//           If prevented from deletion, still can't digivolve.
// KB Q5963: turn-end triggers and the deletion are simultaneous; turn player chooses order.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Masters"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Masters"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "digivolve",
          "duration": "permanent"
        },
        {
          "kind": "DelayedDeletePlayed",
          "timing": "opponentTurnEnd",
          "raw": "deleted at turn end (opponent's turn end)"
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
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Masters"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "security"
          ],
          "payCost": false,
          "optional": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Dark Masters"
                  ],
                  "match": "trait"
                }
              ]
            },
            "count": 1,
            "sameTarget": true
          },
          "restriction": "digivolve",
          "duration": "permanent"
        },
        {
          "kind": "DelayedDeletePlayed",
          "timing": "yourTurnEnd",
          "raw": "delete the Digimon this effect played at end of your turn"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-216", compiled);
