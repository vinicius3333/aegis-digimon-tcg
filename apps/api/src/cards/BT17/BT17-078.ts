// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDNADigivolve",
          "raw": "＜Blast DNA Digivolve ([WarGreymon] + [MetalGarurumon])＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Raid",
          "raw": "＜Raid＞"
        }
      ]
    },
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        {
          "keyword": "Blocker",
          "raw": "＜Blocker＞"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SelectBind",
          "target": { "filter": { "controller": "opponent", "kind": ["Digimon"] }, "count": 1, "bindAs": "dnaReturnLevel", "upTo": true },
          "condition": { "kind": "isDnaDigivolving" }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "relativeTo": { "attr": "level", "op": "eq", "selectionRef": "dnaReturnLevel" }
            },
            "count": "all"
          },
          "to": "deckBottom",
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SelectBind",
          "target": { "filter": { "controller": "opponent", "kind": ["Digimon"] }, "count": 1, "bindAs": "dnaReturnLevel", "upTo": true },
          "condition": { "kind": "isDnaDigivolving" }
        },
        {
          "kind": "Return",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "relativeTo": { "attr": "level", "op": "eq", "selectionRef": "dnaReturnLevel" }
            },
            "count": "all"
          },
          "to": "deckBottom",
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          }
        },
        {
          "kind": "Delete",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "count": 1
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT17-078", compiled);
