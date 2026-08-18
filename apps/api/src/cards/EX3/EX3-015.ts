// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text: [On Play] 1 of your blue Digimon gains <Jamming> for the turn.
// When played from digivolution cards, you may place 1 blue level 5 or lower Digimon card
// from your hand under that Digimon as its bottom digivolution card.
// KB Q&A Q3378: "that Digimon" = the blue Digimon selected by the [On Play] effect.
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
            "bindAs": "jammingTarget"
          }
        },
        {
          "kind": "GainKeyword",
          "target": {
            "fromSelectionRef": "jammingTarget",
            "filter": {},
            "count": 1
          },
          "keyword": {
            "keyword": "Jamming",
            "raw": "＜Jamming＞"
          },
          "duration": "forTheTurn"
        },
        {
          // Conditional on being played from digivolution cards.
          // Target: 1 blue level 5 or lower Digimon card from hand.
          // Destination: under the selected blue Digimon (the one that got Jamming) as bottom digivolution card.
          "kind": "PlaceUnder",
          "target": {
            "filter": {
              "zone": "hand",
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "colors": [
                "Blue"
              ],
              "levelComparison": {
                "op": "lte",
                "value": 5
              }
            },
            "count": 1
          },
          "underSelectionRef": "jammingTarget",
          "position": "bottom",
          "optional": true,
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

registerIrCard("EX3-015", compiled);
