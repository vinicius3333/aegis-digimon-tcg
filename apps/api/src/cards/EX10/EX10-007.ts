// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5012: [On Play] [When Digivolving] effect can target ANY Digimon (yours OR opponent's).
// controllerDefault removed from ModifyDP target so both players' Digimon are eligible.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 3000,
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "amount": 1000,
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 3,
      "names": ["Agumon"],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

export { compiled };

registerIrCard("EX10-007", compiled);
