// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB rulings (binding):
//   Q3113: must add as many as possible to hand and place under Tamer.
//   Q3114: if only 1 applicable card is revealed, add it to hand only —
//          cannot place under a Tamer unless 2+ applicable cards are found.
// The second add (placeUnder Tamer) is thus conditional: only applies when 2 or
// more applicable cards are available. Encoded as requiresMinRevealed:2 on the second add.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnDeletion",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Knightmon"
                    ],
                    "match": "text"
                  },
                  {
                    "tokens": [
                      "Twilight"
                    ],
                    "match": "trait",
                    "orPrevious": true
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Knightmon"
                    ],
                    "match": "text"
                  },
                  {
                    "tokens": [
                      "Twilight"
                    ],
                    "match": "trait",
                    "orPrevious": true
                  }
                ]
              },
              "count": 1,
              "to": "underTamer",
              "requiresMinRevealed": 2
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "isInherited": true,
      "keywords": [
        {
          "keyword": "Reboot",
          "raw": "＜Reboot＞"
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT19-055", compiled);
