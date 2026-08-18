// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Errata text: Trash any 2 digivolution cards from your opponent's Digimon. Then, if you have
// a Tamer with [Joe Kido] in its name, choose 1 of your Digimon. If your opponent has no
// Digimon with as many or more digivolution cards as the chosen Digimon, unsuspend it.
// NOTE: "any 2 digivolution cards" means 2 total across any combination of opponent's Digimon.
// The engine TrashDigivolution targets a single permanent per call; count:all+amount:1 would
// trash 1 from each, not 2 total. Keeping count:1,amount:2 for single-target approximation.
// The "chosen Digimon" comparison is modeled with SelectBind (choose + bind, gated on the Joe
// Kido Tamer) followed by an Unsuspend whose target reads the binding and whose condition
// compares each opponent Digimon's live stack size to the bound selection's via
// `relativeTo: { attr: "digivolutionCount" }` (KB errata: "as many or more", not "more").
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Main",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ],
              "digivolutionCards": "hasAny"
            },
            "count": 1
          },
          "amount": 2
        },
        {
          "kind": "SelectBind",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1,
            "bindAs": "chosen"
          },
          "condition": {
            "kind": "youHave",
            "filter": {
              "controller": "mine",
              "kind": [
                "Tamer"
              ],
              "nameOrTrait": [
                {
                  "tokens": [
                    "Joe Kido"
                  ],
                  "match": "name"
                }
              ]
            },
            "raw": "if you have a Tamer with [Joe Kido] in its name"
          }
        },
        {
          "kind": "Unsuspend",
          "target": {
            "fromSelectionRef": "chosen"
          },
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "kind": [
                "Digimon"
              ],
              "relativeTo": {
                "attr": "digivolutionCount",
                "op": "gte",
                "selectionRef": "chosen"
              }
            },
            "raw": "your opponent has no Digimon with as many or more digivolution cards as the chosen Digimon"
          }
        }
      ]
    },
    {
      "trigger": "Security",
      "actions": [
        {
          "kind": "ActivateMain"
        },
        {
          "kind": "AddToHandSelf"
        }
      ],
      "isSecurity": true
    }
  ],
  "coverage": "partial",
  "residual": [
    "TrashDigivolution 'any 2 across opponent Digimon' needs engine support for pool-trash; currently approximated as 2 from 1 Digimon"
  ]
};

registerIrCard("BT14-091", compiled);
