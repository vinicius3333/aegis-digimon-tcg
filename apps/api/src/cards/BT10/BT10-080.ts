// @ts-nocheck
// Hand-authored override for BT10-080 (SkullBaluchimon).
// runtime-effect fix: the hand-trash effect is a future trigger gated to your turn and
// digivolves one of your Digimon into this card from trash; the When Digivolving
// effect grants an [On Deletion] trigger when the digivolution came from trash.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedFromHand",
          "sourceFilter": {
            "isSelfRef": true
          },
          "fireCondition": {
            "kind": "isYourTurn"
          },
          "actions": [
            {
              "kind": "Digivolve",
              "target": {
                "filter": {
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "into": {
                "filter": {
                  "zone": "trash",
                  "controller": "mine",
                  "kind": [
                    "Digimon"
                  ],
                  "colors": [
                    "Purple"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Undead",
                        "Dark Animal"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "payCost": true,
              "from": [
                "trash"
              ],
              "optional": true
            }
          ],
          "raw": "When one of your effects trashes this card in your hand, if it's your turn, 1 of your Digimon may digivolve into 1 purple Digimon card with [Undead] or [Dark Animal] in its traits from your trash for its digivolution cost."
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "GainTriggeredEffect",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "gainedTrigger": "onDeletionOf",
          "gainedActions": [
            {
              "kind": "Delete",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              }
            }
          ],
          "duration": "untilOpponentTurnEnd",
          "condition": {
            "kind": "digivolvedFromZone",
            "zone": "trash"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT10-080", compiled);
