// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text structure:
// (1) Continuous static: "While you don't have [Bishop Device], you may ignore this
//     card's color requirements." — applies globally whenever this card is in hand/field.
// (2) Triggered trash effect: "When an effect trashes this card in your battle area,
//     When this card is trashed from the battle area" → until end of opponent's turn,
//     1 of their Digimon or Tamers can't suspend.
// (3) [Main]: "Until the end of your opponent's turn, 1 of their Digimon or Tamers can't
//     suspend. Then, place this card in the battle area."
// (4) Security: (from existing IR) Return 1 opponent Digimon lv≤5 to deck bottom; add self to hand.
const compiled: CompiledCard = {
  "effects": [
    {
      // Continuous: while no other [Bishop Device] is in play, may ignore color requirements for this card.
      "trigger": "Static",
      "actions": [
        {
          "kind": "WaiveColorRequirement",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "youHaveNone",
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                { "tokens": ["Bishop Device"], "match": "name" }
              ]
            },
            "raw": "you don't have [Bishop Device]"
          }
        }
      ]
    },
    {
      // Triggered: when this card is trashed from the battle area by an effect,
      // until the end of your opponent's turn 1 of their Digimon or Tamers can't suspend.
      "trigger": "WhenTrashedFromBattleArea",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        }
      ]
    },
    {
      // [Main]: Until the end of your opponent's turn, 1 of their Digimon or Tamers can't
      // suspend. Then, place this card in the battle area.
      "trigger": "Main",
      "actions": [
        {
          "kind": "Restrict",
          "target": {
            "filter": {
              "controllerDefault": "opponent",
              "kind": ["Digimon", "Tamer"]
            },
            "count": 1
          },
          "restriction": "suspend",
          "duration": "untilOpponentTurnEnd"
        },
        {
          "kind": "PlaceInBattleAreaSelf"
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "levelComparison": { "op": "lte", "value": 5 }
            },
            "count": 1
          },
          "to": "deckBottom"
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "full",
  "residual": [
    "WhenTrashedFromBattleArea trigger requires engine support (LANE_E: WhenTrashedFromBattleAreaTrigger)"
  ]
};

registerIrCard("P-161", compiled);
