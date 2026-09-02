import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-060 Alphamon: Ouryuken
// [Hand][Counter] <Blast DNA Digivolve ([Alphamon] + [Ouryumon])>
// [On Play][When Digivolving] 1 of your opponent's Digimon gets -15000 DP until the end
//   of their turn. Then, if DNA digivolving, trash your opponent's top security card and
//   <Recovery +1 (Deck)>.
// [All Turns][Once Per Turn] When security stacks are removed from, gain 3 memory.
//
// KB Q4398: DP hits 0 doesn't delete until all processing resolves.
// KB Q4399: Security effect takes precedence on simultaneous trigger.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDNADigivolve",
          raw: "＜Blast DNA Digivolve ([Alphamon] + [Ouryumon])＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -15000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "security",
              position: "top",
            },
            count: 1,
          },
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Recovery",
            amount: 1,
            raw: "＜Recovery +1 (Deck)＞",
          },
          duration: "permanent",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -15000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "security",
              position: "top",
            },
            count: 1,
          },
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Recovery",
            amount: 1,
            raw: "＜Recovery +1 (Deck)＞",
          },
          duration: "permanent",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [
            {
              kind: "GainMemory",
              amount: 3,
            },
          ],
          raw: "When security stacks are removed from, gain 3 memory",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-060", compiled);
