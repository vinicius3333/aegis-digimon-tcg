// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3333 (binding): only triggers when DIRECTLY trashed from the deck (not via reveal/search).
// KB Q3334 (binding): if activated, must trash at least 1 card (cannot choose 0).
// Banlist: RESTRICTED to 1 copy (since 2023-06-01).
// 1st effect is a whenTrashedFromDeck SubTrigger (not a Static trigger), with exclusion:
//   "if it wasn't trashed by [EX2-039 Impmon]'s effect" (excludeSelfEffect: true).
//   TrashTopDeck: upTo:3, minimum:1 (optional but must trash at least 1 if activated).
// Inherited: the printed "[Beelzemon] in its name" gate is a substring match, so it
// also applies to forms such as Beelzemon: Blast Mode.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "AllTurns",
      "actions": [
        {
          "kind": "SubTrigger",
          "event": "whenTrashedFromDeck",
          "sourceFilter": {
            "isSelfRef": true
          },
          "excludeSelfEffect": true,
          "actions": [
            {
              "kind": "TrashTopDeck",
              "controller": "mine",
              "amount": 3,
              "upTo": true,
              "minimum": 1,
              "optional": true,
              "abortOnDecline": true
            }
          ]
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "RevealAdd",
          "revealCount": 4,
          "add": [
            {
              "filter": {
                "controllerDefault": "mine",
                "kind": [
                  "Digimon"
                ],
                "nameOrTrait": [
                  {
                    "tokens": [
                      "Beelzemon"
                    ],
                    "match": "name"
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
                      "Ai & Mako"
                    ],
                    "match": "name"
                  }
                ]
              },
              "count": 1,
              "to": "hand"
            }
          ],
          "rest": "deckBottom"
        }
      ]
    },
    {
      "trigger": "YourTurn",
      "actions": [
        {
          "kind": "Aura",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "effect": {
            "kind": "modifyDP",
            "amount": 3000
          },
          "while": {
            "kind": "selfHasNameContaining",
            "names": [
              "Beelzemon"
            ]
          }
        }
      ],
      "isInherited": true
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("EX2-039", compiled);
