// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX1-049 MetalTyrannomon
// KB Q3234: The reveal is optional ("You may"), but once you reveal you must perform
// the rest (add + trash remaining cards) to the best of your ability.
// Fix: rest was wrongly "deckBottom"; text says "Trash the remaining cards" → "trash".
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 3,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "levels": [
                  6
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Machine"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "trash",
          "optional": true
        }
      ]
    },
    {
      "trigger": "OpponentsTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "keyword",
            "keyword": {
              "keyword": "Reboot",
              "raw": "＜Reboot＞"
            }
          },
          "while": {
            "kind": "selfHasTrait",
            "filter": {
              "nameOrTrait": [
                { "tokens": ["Machine"], "match": "trait" }
              ]
            },
            "raw": "this Digimon has [Machine] in its traits"
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX1-049", compiled);
