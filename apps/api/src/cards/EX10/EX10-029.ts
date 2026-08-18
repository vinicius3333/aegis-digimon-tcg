import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for EX10-029.
// Fix: SubTrigger whenLinked was inert (no Restrict after SelectBind).
// (documented behavior). Fixed by adding Restrict{cantBeDeDigivolved, untilOpponentTurnEnd}
// on the bound target after SelectBind.
// Added cantBeDeDigivolved to RestrictionKind (ir.ts) + Restriction (EffectContext.ts)
// and a guard in primitives.ts deDigivolve.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Security",
      "isSecurity": true,
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
      ]
    },
    {
      "trigger": "Static",
      "keywords": [],
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
            "keyword": "Blocker"
          },
          "duration": "permanent"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinked",
          "actions": [
            {
              "kind": "SelectBind",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1,
                "bindAs": "A"
              }
            },
            {
              "kind": "Restrict",
              "target": {
                "filter": {},
                "count": 1,
                "fromSelectionRef": "A"
              },
              "restriction": "cantBeDeDigivolved",
              "duration": "untilOpponentTurnEnd"
            }
          ],
          "raw": "[When Linking] By trashing 1 of this Digimon's link cards, <De-Digivolve> effects don't affect 1 of your Digimon until your opponent's turn ends."
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "cost": 2,
      "isAlternate": true,
      "traits": [
        "StandardApp"
      ]
    }
  ],
  "linkRequirement": [
    {
      "cost": 2,
      "traits": [
        "Appmon"
      ]
    }
  ],
};

registerIrCard("EX10-029", compiled);
