import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST17-04 Wendigomon
// [Digivolve] Lv.3 w/[Terriermon] or [Lopmon] in name: Cost 2
//
// [On Play][When Digivolving] Delete 1 level 3 or lower Digimon.
//   Then, if this effect deleted 1 of your Digimon, you may play 1 level 3
//   Digimon card with [Terriermon] or [Lopmon] in its name from your trash
//   without paying the cost.
//
// [Inherited][All Turns] While this Digimon is suspended, it gets +1000 DP.
//
// Q&A (Q826): Must delete own Digimon if opponent has none at level 3 or lower.
// Q&A (Q827): Can play the deleted Digimon from trash immediately.
//
// The follow-up is gated by the deletion receipt, rather than by the identity of
// the card replayed: any own level 3 or lower deletion unlocks the choice.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              nameOrTrait: [
                {
                  tokens: ["Terriermon", "Lopmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "lastDeletedMatchesFilter",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            raw: "this effect deleted one of your Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
            },
            count: 1,
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              nameOrTrait: [
                {
                  tokens: ["Terriermon", "Lopmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "lastDeletedMatchesFilter",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            raw: "this effect deleted one of your Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 1000,
          },
          while: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Terriermon", "Lopmon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST17-04", compiled);
