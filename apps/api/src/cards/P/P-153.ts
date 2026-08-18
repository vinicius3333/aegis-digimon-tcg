// @ts-nocheck
// Hand-fixed IR for P-153 — faithful text encoding.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5135: "my opponent chose this card as the target to return to the hand"
// — singular target. "[When Digivolving] Return 1 of your opponent's level 3,
// level 4 and level 5 to the hand" means return 1 card from among those levels
// (levels:[3,4,5] union), not one card per level.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [{ "keyword": "Armor Purge", "raw": "＜Armor Purge＞" }]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": { "controller": "opponent", "levels": [3, 4, 5] },
            "count": 1
          },
          "to": "hand"
        }
      ]
    },
    {
      // [End of Attack] By placing this Digimon's top card as your top security card,
      // unsuspend this Digimon or Tamer.
      // The cost moves the top digivolution card from the source Digimon's stack to
      // the top of the owner's security stack. This requires capability:
      // placeOwnTopDigivolutionCardAsSecurity (see engine-todo/LANE_E.md).
      "trigger": "EndOfAttack",
      "actions": [
        {
          "kind": "Modal",
          "choose": 1,
          "options": [
            [
              {
                "kind": "Unsuspend",
                "target": {
                  "filter": { "isSelfRef": true },
                  "count": 1,
                  "isSelf": true
                }
              }
            ],
            [
              {
                "kind": "Unsuspend",
                "target": {
                  "filter": { "controller": "mine", "kind": ["Tamer"] },
                  "count": 1
                }
              }
            ]
          ],
          "cost": {
            "kind": "place",
            "destination": "security",
            "position": "top",
            "target": {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true,
              "from": ["digivolutionCards"]
            },
            "raw": "By placing this Digimon's top card as your top security card"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["MagnaGarurumon"],
      "minColors": 3,
      "cost": 2,
      "isAlternate": true
    }
  ]
};
registerIrCard("P-153", compiled);
