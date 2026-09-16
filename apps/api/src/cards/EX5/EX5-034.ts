import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "automatic",
            condition: {
              kind: "totalSecurityCount",
              op: "lte",
              value: 6,
              raw: "there're 6 or fewer total cards in both players' security stacks",
            },
          },
          amount: { kind: "fixed", value: 5 },
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
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { kind: ["Digimon"] },
          actions: [
            {
              kind: "SelectBind",
              chooser: "controller",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                bindAs: "ex5034OptionalTarget",
              },
              optional: true,
              abortOnDecline: true,
              preserveOncePerTurnOnDecline: true,
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {},
                count: 1,
                fromSelectionRef: "ex5034OptionalTarget",
              },
              amount: -4000,
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {},
                count: 1,
                fromSelectionRef: "ex5034OptionalTarget",
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security Attack -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-034", compiled);
