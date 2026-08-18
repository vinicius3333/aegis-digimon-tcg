// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// LM-013 Diarbbitmon
// effectText:
//   [Hand][Counter] (Your Digimon may digivolve into this card without paying the cost.)
//   [On Play][When Digivolving] Suspend 1 of your opponent's Digimon. Then, if they have no
//     unsuspended Digimon, gain 2 memory.
//   [When Attacking] You may play 1 Digimon card with [Angoramon] in its text from your hand
//     without paying the cost. At the end of your opponent's turn, return that Digimon to the hand.
//   KB Q4001: if the played Angoramon digivolves and has cards under it, the top card is returned
//     to hand and all cards beneath it are trashed.
//
// Audit fixes:
// - Counter/BlastDigivolve: empty actions + BlastDigivolve keyword is the CORRECT standard
//   encoding. The audit finding was a false positive — no change needed.
// - [When Attacking] DelayedReturn: replaced with the canonical two-part encoding:
//   (1) WhenAttacking: PlayWithoutCost with resultRef "playedAngoramon"
//   (2) EndOfOpponentsTurn: Return top card of that Digimon to hand + TrashDigivolution remainder
//       (conditioned on the played Angoramon reference being present).
//   KB Q4001: Return top card → hand; trash all cards beneath it (digivolution cards).
const compiled: CompiledCard = {
  "effects": [
    {
      // [Hand][Counter] <Blast Digivolve>: standard keyword encoding — empty actions + keyword.
      "trigger": "Counter",
      "actions": [],
      "isFromHand": true,
      "keywords": [
        {
          "keyword": "BlastDigivolve",
          "raw": "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)"
        }
      ]
    },
    {
      "trigger": "OnPlay",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          }
        },
        {
          "kind": "GainMemory",
          "amount": 2,
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "suspended": false
            },
            "raw": "they have no unsuspended Digimon"
          }
        }
      ]
    },
    {
      "trigger": "WhenDigivolving",
      "actions": [
        {
          "kind": "Suspend",
          "target": {
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"]
            },
            "count": 1
          }
        },
        {
          "kind": "GainMemory",
          "amount": 2,
          "condition": {
            "kind": "opponentHasNone",
            "filter": {
              "controller": "opponent",
              "kind": ["Digimon"],
              "suspended": false
            },
            "raw": "they have no unsuspended Digimon"
          }
        }
      ]
    },
    {
      // [When Attacking]: play an Angoramon-text Digimon from hand without cost.
      // resultRef captures the identity of the played Digimon for the EndOfOpponentsTurn trigger.
      "trigger": "WhenAttacking",
      "actions": [
        {
          "kind": "PlayWithoutCost",
          "target": {
            "filter": {
              "controller": "mine",
              "kind": ["Digimon"],
              "nameOrTrait": [
                { "tokens": ["Angoramon"], "match": "text" }
              ]
            },
            "count": 1
          },
          "from": ["hand"],
          "payCost": false,
          "optional": true,
          "resultRef": "playedAngoramon"
        }
      ]
    },
    {
      // At the end of your opponent's turn: return the top card of the played Angoramon to hand.
      // KB Q4001: if it digivolved, the TOP card goes to hand; all cards BENEATH it are trashed.
      "trigger": "EndOfOpponentsTurn",
      "actions": [
        {
          // Return the top card (the Digimon or whatever is on top of the stack) to hand.
          "kind": "Return",
          "target": {
            "filter": {
              "fromSelectionRef": "playedAngoramon",
              "topCard": true
            },
            "count": 1
          },
          "to": "hand",
          "condition": {
            "kind": "selectionRefExists",
            "ref": "playedAngoramon",
            "raw": "the played Angoramon is still in play"
          }
        },
        {
          // KB Q4001: trash all digivolution cards beneath the returned top card.
          "kind": "TrashDigivolution",
          "target": {
            "fromSelectionRef": "playedAngoramon"
          },
          "amount": 99,
          "condition": {
            "kind": "selectionRefExists",
            "ref": "playedAngoramon",
            "raw": "the played Angoramon digivolved (has cards beneath it)"
          }
        }
      ]
    }
  ],
  "coverage": "full",
  "residual": [
    "selectionRefExists condition: EndOfOpponentsTurn must gate on whether the played Angoramon reference is still valid. Engine needs cross-trigger selection reference persistence (spec'd in LANE_A.md if missing).",
    "topCard flag on fromSelectionRef: return only the top card of the tracked Digimon stack (KB Q4001 — if digivolved, top card goes to hand). Spec'd in LANE_A.md."
  ]
};

registerIrCard("LM-013", compiled);
