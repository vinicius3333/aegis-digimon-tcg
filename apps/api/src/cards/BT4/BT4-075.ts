// @ts-nocheck
// Hand-authored override for BT4-075 (Blastmon).
// runtime-effect fix: WhenAttacking should encode a single optional RedirectAttack where the opponent
// may choose 1 of their unsuspended Digimon (Q1224: opponent decides whether to switch; if they do,
// must target an unsuspended Digimon). Removed the two-step broken encoding.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "SecurityAttack",
          "amount": 1,
          "raw": "＜Security Attack +1＞"
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "RedirectAttack",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "unsuspended": true
            },
            "count": 1
          },
          "chooser": "opponent",
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT4-075", compiled);
