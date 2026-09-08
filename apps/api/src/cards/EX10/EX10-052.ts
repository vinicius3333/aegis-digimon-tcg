import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
          },
          count: 1,
        },
        raw: "By trashing 1 card in your hand",
      },
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          optional: true,
          controller: "opponent",
          allowCostWithoutTarget: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "this effect didn't delete",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
          },
          count: 1,
        },
        raw: "By trashing 1 card in your hand",
      },
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          optional: true,
          controller: "opponent",
          allowCostWithoutTarget: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "this effect didn't delete",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          // `optional: false` on the REPLACEMENT is what stops the engine asking its
          // controller "Prevent leaving the battle area?" — the printed "may" belongs to the
          // opponent's deletion, and the prevention itself is mandatory.
          kind: "Replacement",
          event: "wouldLeavePlay",
          optional: false,
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
              optional: true,
              controller: "opponent",
            },
            {
              // Mandatory: the printed "may" belongs to the opponent's deletion, not to the
              // prevention. Without `optional: false` the replacement asks its controller
              // "Prevent leaving the battle area?" and a decline lets the removal through.
              kind: "Prevent",
              mode: "leavePlay",
              optional: false,
              condition: { kind: "ifThisEffectDidNotDelete", raw: "this effect didn't delete" },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Lucemon"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-052", compiled);

export { compiled };
