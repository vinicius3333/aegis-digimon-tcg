// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-074 Satellamon
// [Digivolve] Lv.4 w/[Three Musketeers] in text: Cost 3
// [On Play][When Digivolving] By placing 1 [Appmon]/[Three Musketeers] trait card from your
//   hand or trash as any of your Digimon's bottom digivolution card, until your opponent's
//   turn ends, their effects can't return that Digimon to hands or decks or affect it with
//   <De-Digivolve> effects.
// [When Digivolving][When Attacking][Once Per Turn] By trashing 1 card with the
//   [Appmon]/[Three Musketeers] trait from your Digimon's digivolution cards, <De-Digivolve 1>
//   1 of your opponent's Digimon.
//
// Audit: "that Digimon" = your Digimon that received the placed card (controller: mine).
// Audit: restrictions are beReturned + cantBeDeDigivolved (not immuneToOpponentEffects).
// Audit: cost target is any card (not just Digimon kind) with the trait.
// Audit: trash cost zone = digivolutionCards of your Digimon (not hand/trash/battleArea).
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "beReturned",
          "byOpponentEffectsOnly": true,
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Appmon",
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target",
            "raw": "By placing 1 [Appmon]/[Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "cantBeDeDigivolved",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "beReturned",
          "byOpponentEffectsOnly": true,
          "duration": "untilOpponentTurnEnd",
          "cost": {
            "kind": "place",
            "target": {
              "filter": {
                "controller": "mine",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Appmon",
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1,
              "from": [
                "hand",
                "trash"
              ]
            },
            "underFilter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "destination": "digivolutionStack",
            "position": "bottom",
            "host": "target",
            "raw": "By placing 1 [Appmon]/[Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card"
          },
          "optional": true,
          "abortOnDecline": true
        },
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "restriction": "cantBeDeDigivolved",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Appmon",
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with the [Appmon]/[Three Musketeers] trait from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "DeDigivolve",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          },
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "controller": "mine",
                "zone": "digivolutionCards",
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Appmon",
                      "Three Musketeers"
                    ],
                    "match": "trait"
                  }
                ]
              },
              "count": 1
            },
            "raw": "By trashing 1 card with the [Appmon]/[Three Musketeers] trait from your Digimon's digivolution cards"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "level": 4,
      "texts": [
        "Three Musketeers"
      ],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT21-074", compiled);
