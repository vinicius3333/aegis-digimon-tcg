import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-086";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            raw: "your opponent has a Digimon",
          },
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
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }],
              suspended: false,
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          raw: "When this Tamer suspends",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: { controller: "mine", kind: ["Digimon"] },
                count: 1,
                bindAs: "boostedDigimon",
              },
            },
            {
              kind: "GainKeyword",
              target: { filter: {}, count: 1, fromSelectionRef: "boostedDigimon" },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: { filter: {}, count: 1, fromSelectionRef: "boostedDigimon" },
              amount: 3000,
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
