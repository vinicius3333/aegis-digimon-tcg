import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { useTriggerSource: true }, count: 1 },
              grant: "kind",
              tokens: ["Digimon"],
              staticEffect: { kind: "SetBaseDP", value: 12000, keyword: "Rush", restriction: "digivolve" },
              duration: "forTheTurn",
            },
          ],
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          bindResultAs: "playedMarcus",
        },
      ],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["ShineGreymon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Marcus Damon"] },
    },
  ],
};

registerIrCard("BT13-020", compiled);
export { compiled };
