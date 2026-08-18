// @ts-nocheck
// HAND-FIXED IR for BT10-042 (Venusmon) — do not regenerate over this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fix: the [Opponent's Turn] static restrict must apply ONLY to opponent Digimon
// that have ＜Security Attack＞ (Q1965: any Digimon affected by SA+ or SA-; Q1966: a
// gate and restricted ALL opponent Digimon. The keyword filter below restores the gate
// (permanentMatchesFilter reads both printed ＜Security Attack＞ text and granted SA
// keywords — e.g. the SA-1 this card's [When Digivolving] clause confers).
const compiled: CompiledCard = {
  "effects": [
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
            "count": "all"
          },
          "keyword": {
            "keyword": "SecurityAttack",
            "amount": -1,
            "raw": "＜Security Attack -1＞"
          },
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "keywords": [
                "SecurityAttack"
              ]
            },
            "count": "all"
          },
          "restriction": "attack",
          "specificTarget": "source",
          "duration": "permanent"
        },
        {
          "kind": "DisableTimingEffect",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "keywords": [
                "SecurityAttack"
              ]
            },
            "count": "all"
          },
          "timings": [
            "whenDigivolving",
            "whenAttacking"
          ],
          "duration": "permanent"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};
registerIrCard("BT10-042", compiled);
