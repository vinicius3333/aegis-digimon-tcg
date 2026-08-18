// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override (runtime-effect fix). KB Q3385: "that Digimon" refers to the blue
// Digimon chosen by the first action, NOT this card. Bind that selection and unsuspend
// it (previously isSelfRef wrongly unsuspended this card). The entry-zone receipt gates
// the unsuspend so an ordinary hand play grants Blocker without readying the target.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ]
            },
            "count": 1,
            "bindAs": "blocker"
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "blocker",
            "filter": {},
            "count": 1
          },
          "keyword": {
            "keyword": "Blocker",
            "raw": "＜Blocker＞"
          },
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "Unsuspend",
          "target": {
            "fromSelectionRef": "blocker",
            "filter": {},
            "count": 1
          },
          "condition": {
            "kind": "playedFromZone",
            "zone": "digivolutionCards",
            "raw": "when played from digivolution cards"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX3-017", compiled);
