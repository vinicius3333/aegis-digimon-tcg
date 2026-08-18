// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST23-06 Gekkomon
// [Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0
// [When Moving] [On Play] Reveal the top 3 cards of your deck. Among them, add 1
//   [Glowing Dawn] trait card to the hand and place 1 such card face down under any
//   of your [Glowing Dawn] trait Tamers. Return the rest to the bottom of the deck.
// [Inherited] <Piercing>
//
// KB Q6169: if only 1 [Glowing Dawn] card is revealed, add just that 1 card.
// KB Q6170: placed card goes to the bottom of cards under the Tamer.
// KB Q6171: cannot reorder face-down cards under a Tamer.
// KB Q6172: only the owner can look at face-down cards under a Tamer.
// KB Q6173: a face-down card trashed from under a Tamer is placed face-up in the trash.
//
// Residual: The second add slot uses to:"placeUnder" targeting a [Glowing Dawn] Tamer.
// The RevealAdd engine path (runRevealAdd) hardcodes p.kind==="Digimon" for placeUnder
// hosts — Tamer hosts are not yet supported. Until the engine is extended, the
// place-under-Tamer slot is inert. See LANE_F.md capability spec.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenMoving",
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
                      "Glowing Dawn"
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
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Glowing Dawn"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "placeUnder",
              "underFilter": {
                "controllerDefault": "mine",
                "kind": [
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Glowing Dawn"
                    ],
                    "match": "trait"
                  }
                ]
              }
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
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
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Glowing Dawn"
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
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Glowing Dawn"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "to": "placeUnder",
              "underFilter": {
                "controllerDefault": "mine",
                "kind": [
                  "Tamer"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Glowing Dawn"
                    ],
                    "match": "trait"
                  }
                ]
              }
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
          "keyword": "Piercing",
          "raw": "＜Piercing＞"
        }
      ]
    }
  ],
  "coverage": "partial",
  "residual": [
    "RevealAdd placeUnder to Tamer host not yet supported by engine — place-under-[Glowing Dawn]-Tamer slot is inert until RevealAdd is extended to allow Tamer hosts (see LANE_F.md)"
  ],
  "digivolutionRequirement": [
    {
      "level": 2,
      "traits": [
        "Glowing Dawn"
      ],
      "cost": 0,
      "isAlternate": true
    }
  ]
};

registerIrCard("ST23-06", compiled);
