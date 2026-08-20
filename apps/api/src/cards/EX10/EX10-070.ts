// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5184 (binding): does NOT trigger when a link card is trashed and replaced by a linking effect.
// [AllTurns]: SubTrigger event "whenLinkTrashed" (the only link-card-trash event the engine's
// `trash` primitive actually fires — apps/api/src/engine/effects/primitives.ts;
// "whenLinkCardTrashedByEffect" is a catalog-only alias nothing ever fires), sourceFilter
// controller "mine" + kind ["Digimon"] (text: "any of YOUR Digimon's link cards"). The Delay
// keyword is on the triggered sub-effect (arms a next-main-phase Link).
// The Link action targets 1 [Appmon] from trash onto the Digimon whose link card was trashed
// (sourceRef — the Digimon that triggered the event).
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon",
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Appmon"
                  ],
                  "match": "trait"
                }
              ]
            },
            "raw": "you have a Digimon or Tamer with the [Appmon] trait on the field"
          }
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Draw",
          "controller": "mine",
          "amount": 1
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenLinkTrashed",
          "sourceFilter": {
            "controller": "mine",
            "kind": [
              "Digimon"
            ]
          },
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
                "keyword": "Delay",
                "raw": "＜Delay＞"
              },
              "duration": "untilActivated"
            },
            {
              "kind": "Link",
              "target": {
                "filter": {
                  "controller": "mine",
                  "zone": "trash",
                  "kind": [
                    "Digimon"
                  ],
                  "nameOrTrait": [
                    {
                      "tokens": [
                        "Appmon"
                      ],
                      "match": "trait"
                    }
                  ]
                },
                "count": 1
              },
              "onto": {
                "filter": {
                  "isSourceRef": true
                }
              },
              "payCost": false,
              "optional": true,
              "delayedEffect": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX10-070", compiled);
