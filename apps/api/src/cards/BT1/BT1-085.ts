// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Red"], digivolutionCardsAtLeast: 4 },
            count: "all",
          },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
          while: { kind: "true" },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false, target: { isSelf: true } }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-085", compiled);
export default compiled;
