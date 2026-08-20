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
// The second add slot uses the dedicated underTamer disposition so the selected
// face-down card is placed beneath a matching [Glowing Dawn] Tamer.
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
              "to": "underTamer",
              "faceDown": true,
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
              "to": "underTamer",
              "faceDown": true,
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
  "coverage": "full",
  "residual": [],
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
