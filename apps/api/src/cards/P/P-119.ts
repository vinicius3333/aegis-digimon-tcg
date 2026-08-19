// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-119 Hawkmon
// [On Play] Reveal top 3 → add 1 (Red or Yellow multicolor) + 1 Tamer [Yolei Inoue]; rest to bottom.
// [Inherited][End of Your Turn] May DNA digivolve THIS + 1 other Digimon into a hand Digimon,
//   paying its DNA digivolve cost.
// KB Q4229: add as many qualifying cards as possible from the revealed pool.
// KB Q4230: "red or yellow card with 2 or more colors" = multicolor card with Red or Yellow.
// KB Q4231: if both types present among revealed, must add both.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "multicolor": true,
                "colors": [
                  "Red",
                  "Yellow"
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Yolei Inoue"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "EndOfYourTurn",
      "actions": [
        {
          "kind": "DnaDigivolve",
          "materials": [
            {
              "filter": { "isSelfRef": true },
              "count": 1,
              "isSelf": true
            },
            {
              "filter": {
                "controller": "mine",
                "kind": ["Digimon"],
                "excludeSelf": true
              },
              "count": 1
            }
          ],
          "into": {
            "controllerDefault": "mine",
            "kind": [
              "Digimon"
            ]
          },
          "payCost": true,
          "optional": true
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("P-119", compiled);
