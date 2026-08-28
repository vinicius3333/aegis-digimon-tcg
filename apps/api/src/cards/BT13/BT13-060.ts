// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 } },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: "all" },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          scaling: {
            per: 2,
            filter: {
              controller: "opponent",
              zone: "battleArea",
              suspended: true,
              kind: ["Digimon", "Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Rosemon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
    },
  ],
};

registerIrCard("BT13-060", compiled);
