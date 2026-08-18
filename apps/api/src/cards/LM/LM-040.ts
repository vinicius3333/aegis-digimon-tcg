// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4843: the Then clause (-6000 DP) always fires regardless of the if-condition.
const compiled: CompiledCard = {
  "effects": [
    {
      "trigger": "Static",
      "actions": [],
      "keywords": [
        { "keyword": "IceClad", "raw": "＜Ice Clad＞" }
      ]
    },
    {
      // "Trash any 4 digivolution cards from your opponent's Digimon"
      // "any 4" = 4 cards collectively across opponent's Digimon, player chooses which;
      // not restricted to top cards and not locked to a single Digimon.
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "TrashDigivolution",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "digivolutionCards": "hasAny"
            },
            "count": "any"
          },
          "amount": 4,
          "fromTop": false,
          "distributed": true
        }
      ]
    },
    {
      "trigger": "WhenAttacking",
      "actions": [
        {
          // If opponent has no Digimon with >= digivolution cards as this Digimon, unsuspend self.
          "kind": "Unsuspend",
          "target": {
            "filter": { "isSelfRef": true },
            "count": 1,
            "isSelf": true
          },
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "digivolutionCardsGteSource": true,
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "raw": "your opponent has no Digimon with as many or more digivolution cards as this Digimon"
          }
        },
        {
          // "Then, all of your opponent's Security Digimon get -6000 DP for the turn."
          // Always fires (KB Q4843).
          "kind": "ModifyDP",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "zone": "security"
            },
            "count": "all"
          },
          "amount": -6000,
          "duration": "forTheTurn"
        }
      ],
      "frequency": "OncePerTurn"
    }
  ],
  "coverage": "full",
  "residual": [],
  "digivolutionRequirement": [
    {
      "names": ["Shakkoumon", "Zudomon"],
      "cost": 3,
      "isAlternate": true
    }
  ]
};

registerIrCard("LM-040", compiled);
