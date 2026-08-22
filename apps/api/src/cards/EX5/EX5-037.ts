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
          target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Deva"], match: "trait" }] }, count: 1 },
          from: ["hand"], payCost: false, breeding: true, notSameNameAs: ["battleArea", "trash"], optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 1 }, actions: [{ kind: "GainMemory", amount: 1 }] }],
    },
    {
      trigger: "WhenAttacking",
      actions: [{ kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "Piercing" }, duration: "forTheTurn", condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Four Sovereigns", "God Beast"], match: "trait" }] } } }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-037", compiled);
