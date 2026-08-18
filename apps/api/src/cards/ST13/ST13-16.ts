// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST13-16 Legend-Arms Alliance
// effectText:
//   [Main] You may play 1 Digimon card with [Legend-Arms] in its traits and a play cost of 7 or
//     less in your hand without paying its memory cost. Then, place this card in your Battle Area.
//   [Main] <Delay> (Trash this card in your battle area to activate the effect below. You can't
//     activate this effect the turn this card enters play.)
//     • Reveal the top 4 cards of your deck. Place those cards on the top or bottom of your deck
//       in any order.
//
// Audit fixes:
// - [Main] PlayWithoutCost: added Legend-Arms trait filter and playCostLte:7 restriction.
// - [Main] PlaceInBattleAreaSelf: removed optional:true — KB Q794 confirms placement is not
//   conditional on whether a Digimon was played. The placement is a separate non-optional step.
//   (You can choose not to play a Digimon but still place; the whole effect is optional overall.)
// - <Delay> RevealAdd: the text says place at TOP or BOTTOM of deck, not just bottom (KB Q795:
//   must choose all-top or all-bottom). Changed rest to "deckTopOrBottom".
// - <Delay> SecurityManipulation shuffle: REMOVED — not present in printed text.
// - Security: same PlayWithoutCost fix as [Main] (Legend-Arms trait + playCostLte:7).
// - Security PlaceInBattleAreaSelf: removed optional:true.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Legend-Arms"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 7
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        },
        {
          // KB Q794: placing this card in your Battle Area is not optional — it's an unconditional
          // "then" step even if you chose not to play a Digimon.
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "Trash",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          }
        },
        {
          // KB Q795: all revealed cards go to top OR all go to bottom — player chooses which.
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [],
          "rest": "deckTopOrBottom"
        }
      ],
      "keywords": [
        {
          "keyword": "Delay",
          "raw": "＜Delay＞"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "kind": [
                "Digimon"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Legend-Arms"
                  ],
                  "match": "trait"
                }
              ],
              "playCostLte": 7
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": false,
          "optional": true
        },
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

registerIrCard("ST13-16", compiled);
