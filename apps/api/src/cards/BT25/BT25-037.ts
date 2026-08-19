// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Armor Purge",
          "raw": "＜Armor Purge＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "controller": "mine",
          "amount": 1,
          "source": {
            "filter": {
              "controllerDefault": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [{ "tokens": ["Angel", "Archangel", "Three Great Angels", "Iliad"], "match": "trait" }]
            },
            "orFilters": [{
              "controllerDefault": "mine",
              "kind": ["Tamer"],
              "nameOrTrait": [{ "tokens": ["TS"], "match": "trait" }]
            }],
            "count": 1
          },
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "toHand",
          "controller": "mine",
          "amount": 1,
          "toTop": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "controller": "mine",
          "amount": 1,
          "source": {
            "filter": {
              "controllerDefault": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [{ "tokens": ["Angel", "Archangel", "Three Great Angels", "Iliad"], "match": "trait" }]
            },
            "orFilters": [{
              "controllerDefault": "mine",
              "kind": ["Tamer"],
              "nameOrTrait": [{ "tokens": ["TS"], "match": "trait" }]
            }],
            "count": 1
          },
          "optional": true
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": [
        "Patamon"
      ],
      "cost": 2,
      "isAlternate": true
    },
    {
      "level": 3,
      "traits": [
        "TS"
      ],
      "cost": 2,
      "isAlternate": true
    }
  ]
};

registerIrCard("BT25-037", compiled);
