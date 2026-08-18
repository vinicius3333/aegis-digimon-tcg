// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT14-029.
// effectText: "[When Digivolving] Trash any 3 digivolution cards from your opponent's
// Digimon." — 21 corpus cards share this exact "trash any N digivolution cards from your
// opponent's Digimon" (bare scope, no "1 of"/"all of" qualifier) phrasing, and the general
// compiler handler reads it as trashing N cards from a SINGLE chosen Digimon (count:1,
// amount:N — see the handler's own comment in action-handlers/index.mjs for why that
// approximation was chosen). But this card's Q&A (Q2398) explicitly confirms the split
// reading: "trash 1 digivolution card each from 3 of my opponent's Digimon" is legal, same
// as "2 from one Digimon and 1 from another." TrashDigivolution's `count`/`amount` model
// can't express "up to 3 total, freely split," but `count:3, amount:1` (select up to 3
// Digimon, one card from each) captures the QA-approved "1 each from 3" case, which the
// single-Digimon reading cannot. No distinguishing text separates this card from its 20
// siblings using the single-Digimon shape, so the general handler is left alone — a
// per-card override is the only way to keep this card's KB-verified reading from being
// silently reverted by a future recompile.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "WhenDigivolving",
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
            "count": 3
          },
          "amount": 1
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "Unsuspend",
          "target": {
            "filter": {
              "isSelfRef": true
            },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "digivolutionCardsCompareToSource": "gte",
              "controllerDefault": "opponent",
              "kind": [
                "Digimon"
              ]
            },
            "raw": "your opponent has no Digimon with more digivolution cards than this Digimon"
          }
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": []
};

registerIrCard("BT14-029", compiled);
