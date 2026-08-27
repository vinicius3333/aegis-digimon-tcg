// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Deva"], match: "trait" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          breeding: true,
          notSameNameAs: ["battleArea", "trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      description: "[Your Turn] When you use an Option card with a cost of 1 or more, gain 1 memory.",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: { kind: "triggerOptionCostAtLeast", value: 1 },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    },
    {
      trigger: "YourTurn",
      description:
        "[Your Turn] [Once Per Turn] While this Digimon has the [Four Sovereigns]/[God Beast] trait, it gains ＜Piercing＞.",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Four Sovereigns", "God Beast"], match: "trait" }] },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-037", compiled);
