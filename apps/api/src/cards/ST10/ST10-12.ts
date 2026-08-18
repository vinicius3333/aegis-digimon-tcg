// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q744: whole RevealAdd is optional (must trash 1 hand card to activate).
// Q745: both yellow and purple adds require [Angel], [Archangel], or [Fallen Angel] trait.
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
                "colors": [
                  "Yellow"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Angel",
                      "Archangel"
                    ],
                    "match": "trait"
                  },
                  {
                    "tokens": [
                      "Fallen Angel"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            },
            {
              "filter": {
                "controllerDefault": "mine",
                "colors": [
                  "Purple"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Angel",
                      "Archangel"
                    ],
                    "match": "trait"
                  },
                  {
                    "tokens": [
                      "Fallen Angel"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom",
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "by trashing 1 card in your hand"
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "GainKeyword",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Yellow"
              ]
            },
            "count": "all"
          },
          "keyword": {
            "keyword": "Retaliation",
            "raw": "＜Retaliation＞"
          },
          "duration": "permanent"
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("ST10-12", compiled);
