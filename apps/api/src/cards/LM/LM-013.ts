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
// - [When Attacking] delayed return: uses `bindResultAs` plus a `nextEndOfOpponentTurn`
//   DelayedEffect, the encoding BT17-069 already uses for the same printed sentence. The
//   earlier `selectionRefExists`/`fromSelectionRef` shape had no interpreter support and left
//   two residual entries; Q4001 falls out of the return-to-hand rule itself.
const compiled: CompiledCard = {
  effects: [
    {
      // [Hand][Counter] <Blast Digivolve>: standard keyword encoding — empty actions + keyword.
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "opponentHasNone",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            raw: "they have no unsuspended Digimon",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "opponentHasNone",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            raw: "they have no unsuspended Digimon",
          },
        },
      ],
    },
    {
      // [When Attacking]: play an Angoramon-text Digimon from hand without cost, then hand it
      // back at the next end of the opponent's turn. `bindResultAs` + a `nextEndOfOpponentTurn`
      // DelayedEffect is the shape BT17-069 uses for the same printed sentence.
      // KB Q4001 needs no extra clause: returning a battle-area Digimon to the hand already
      // sends the TOP card to the hand and trashes everything stacked beneath it.
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          bindResultAs: "playedAngoramon",
        },
        {
          kind: "DelayedEffect",
          effect: {
            kind: "Return",
            target: {
              // No `isSelf`: the return targets the card this effect PLAYED, not Diarbbitmon.
              filter: {
                boundRef: "playedAngoramon",
              },
              count: 1,
            },
            to: "hand",
          },
          trigger: "nextEndOfOpponentTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-013", compiled);
