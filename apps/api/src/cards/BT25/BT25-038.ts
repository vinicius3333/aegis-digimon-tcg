// @ts-nocheck
// HAND-FIXED IR for BT25-038 (Shakkoumon) — do not regenerate over this file.
//
// runtime-effect fixes:
//  1. "as the top or bottom security card" (controller's choice) was hardcoded op:"addTop";
//     recompiled to op:"addTopOrBottom" (the interpreter already prompts top-vs-bottom).
//  2. "trash both players' top security cards" trashed only 1 of the CONTROLLER's own
//     generic cards (kind:"Trash", controllerDefault:"mine", no security zone at all);
//     recompiled as SecurityManipulation op:"trashTop" with bothPlayers:true.
//  3. The [All Turns] De-Digivolve effect fired unconditionally every turn instead of on
//     "[All Turns][Once Per Turn] When your security stack is added to, ..."; wrapped in a
//     SubTrigger event:"whenAddSecurity" (mirrors the sibling inherited whenSecurityRemoved
//     effect on this same card).
//  4. "Then, if DNA digivolving, trash both players' top security cards" has no "you may" —
//     the trashTop action from fix #2 above dropped a stray optional:true, which would have
//     let the controller decline an unconditionally-mandatory (once the condition holds) trash.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "controller": "mine",
          "amount": 1,
          "source": {
            "filter": {
              "trait": [
                "Angel",
                "Archangel",
                "Three Great Angels",
                "Iliad"
              ]
            },
            "location": [
              "hand",
              "digivolution"
            ]
          },
          "optional": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "bothPlayers": true,
          "amount": 1,
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "SecurityManipulation",
          "op": "addTopOrBottom",
          "controller": "mine",
          "amount": 1,
          "source": {
            "filter": {
              "trait": [
                "Angel",
                "Archangel",
                "Three Great Angels",
                "Iliad"
              ]
            },
            "location": [
              "hand",
              "digivolution"
            ]
          },
          "optional": true
        },
        {
          "kind": "SecurityManipulation",
          "op": "trashTop",
          "controller": "mine",
          "bothPlayers": true,
          "amount": 1,
          "condition": {
            "kind": "isDnaDigivolving",
            "raw": "DNA digivolving"
          }
        }
      ]
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenAddSecurity",
          "sourceFilter": {
            "controller": "mine"
          },
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
              "amount": 1
            }
          ],
          "raw": "whenAddSecurity"
        }
      ],
      "frequency": "OncePerTurn"
    },
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenSecurityRemoved",
          "sourceFilter": {
            "controller": "mine"
          },
          "actions": [
            {
              "kind": "ModifyDP",
              "target": {
                "filter": {
                  "controller": "opponent",
                  "kind": [
                    "Digimon"
                  ]
                },
                "count": 1
              },
              "amount": -4000,
              "duration": "forTheTurn"
            }
          ],
          "raw": "whenSecurityRemoved"
        }
      ],
      "isInherited": true,
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT25-038", compiled);
