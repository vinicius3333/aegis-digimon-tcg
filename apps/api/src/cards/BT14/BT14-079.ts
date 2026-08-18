// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Conditional level ceiling (Eiji Nagasumi in digivolution cards → lte 4 instead of lte 3)
// cannot be encoded as a single PlayWithoutCost action with existing engine primitives.
// Approximation: allow lte 4 only when Eiji is present (via condition on second action),
// and allow lte 3 unconditionally. This gives separate actions; a true conditional-ceiling
// filter is tracked as an engine backlog item.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "levelComparison": { "op": "lte", "value": 3 },
              "nameOrTrait": [
                { "tokens": ["Dark Animal", "SoC"], "match": "trait" }
              ]
            },
            "count": 1
          },
          "from": ["trash"],
          "payCost": false,
          "optional": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "GainMemory",
          "amount": 1,
          "cost": {
            "kind": "trash",
            "target": {
              "filter": {
                "zone": "hand",
                "controller": "mine"
              },
              "count": 1
            },
            "raw": "By trashing 1 card in your hand"
          },
          "optional": true,
          "abortOnDecline": true
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenPlayed",
          "sourceFilter": {
            "controllerDefault": "mine",
            "nameOrTrait": [
              { "tokens": ["Dark Animal", "SoC"], "match": "trait" }
            ]
          },
          "actions": [
            {
              "kind": "Unsuspend",
              "target": {
                "filter": { "isSelfRef": true },
                "count": 1,
                "isSelf": true
              },
              "optional": true
            }
          ]
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "partial",
  "residual": [
    "[When Digivolving] conditional level ceiling: if [Eiji Nagasumi] in digivolution cards, level may be up to 4 (engine gap: no conditional-ceiling filter)"
  ]
};

registerIrCard("BT14-079", compiled);
