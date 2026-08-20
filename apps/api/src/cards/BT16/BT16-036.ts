// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// DNA Digivolve (Yellow Lv.6 + Black Lv.6, cost 0), unsuspended.
// <Barrier> <Blocker> <Partition (yellow Lv.6 & black Lv.6)>
// [When Digivolving] De-Digivolve 3 on 1 opponent Digimon. Then 1 of their Digimon gets -8000 DP.
// [End of Opponent's Turn] Trash top card of BOTH players' security stacks.
// (Rule) Trait: Has [Boss] and [D-Brigade] permanently.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "GrantStatic",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "grant": "trait",
          "tokens": ["Boss", "D-Brigade"]
        }
      ],
      "keywords": [
        {
          "keyword": "Barrier",
          "raw": "＜Barrier＞"
        },
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        },
        {
          "keyword": "Partition",
          "raw": "＜Partition (yellow Lv.6 & black Lv.6)＞"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"]
            },
            "count": 2
          },
          "into": {
            "controllerDefault": "mine",
            "kind": ["Digimon"],
            "nameOrTrait": [
              {
                "tokens": ["Chaosmon"],
                "match": "name"
              }
            ]
          },
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": 3
        },
        {
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          },
          "amount": -8000,
          "duration": "forTheTurn"
        }
      ]
    },
    {
      "trigger": "EndOfOpponentsTurn",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "mine",
              "zone": "security"
            },
            "count": 1
          }
        },
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "controller": "opponent",
              "zone": "security"
            },
            "count": 1
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "dnaDigivolveRequirement": [
    {
      "cost": 0,
      "materials": [
        {
          "color": "Yellow",
          "level": 6
        },
        {
          "color": "Black",
          "level": 6
        }
      ]
    }
  ]
};

registerIrCard("BT16-036", compiled);
export { compiled };
