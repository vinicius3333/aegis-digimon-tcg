// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  "digivolutionRequirement": [
    { "level": 5, "cost": 4, "colors": ["Green", "Black"], "isAlternate": true },
    { "level": 5, "traits": ["Royal Base"], "cost": 3, "isAlternate": true }
  ],
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "source": "handOrTrash",
          "filter": {
            "nameOrTrait": [
              { "tokens": ["Royal Base"], "match": "trait" }
            ]
          },
          "amount": 1,
          "optional": true
        },
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "budget": 8,
          "upTo": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "faceUp": true
            },
            "unit": "security",
            "budgetAdd": 2
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "source": "handOrTrash",
          "filter": {
            "nameOrTrait": [
              { "tokens": ["Royal Base"], "match": "trait" }
            ]
          },
          "amount": 1,
          "optional": true
        },
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "budget": 8,
          "upTo": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "faceUp": true
            },
            "unit": "security",
            "budgetAdd": 2
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "source": "handOrTrash",
          "filter": {
            "nameOrTrait": [
              { "tokens": ["Royal Base"], "match": "trait" }
            ]
          },
          "amount": 1,
          "optional": true
        },
        {
          "kind": "DeleteBudget",
          "filter": {
            "controller": "opponent",
            "kind": [
              "Digimon"
            ]
          },
          "budget": 8,
          "upTo": true,
          "scaling": {
            "per": 1,
            "filter": {
              "controller": "mine",
              "faceUp": true
            },
            "unit": "security",
            "budgetAdd": 2
          }
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-0"
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayFromZone",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Base"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "costReductionScaling": {
            "per": 1,
            "unit": "security",
            "filter": {
              "controller": "mine",
              "faceUp": true
            }
          },
          "optional": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-1"
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayFromZone",
          "target": {
            "filter": {
              "controllerDefault": "mine",
              "nameOrTrait": [
                {
                  "tokens": [
                    "Royal Base"
                  ],
                  "match": "text"
                }
              ]
            },
            "count": 1
          },
          "from": [
            "hand"
          ],
          "payCost": true,
          "costReductionScaling": {
            "per": 1,
            "unit": "security",
            "filter": {
              "controller": "mine",
              "faceUp": true
            }
          },
          "optional": true
        }
      ],
      "frequency": "OncePerTurn",
      "sharedUseKey": "ir-shared-1"
    }
  ],
  "coverage": "full",
  "residual": [],
};

registerIrCard("EX11-034", compiled);
