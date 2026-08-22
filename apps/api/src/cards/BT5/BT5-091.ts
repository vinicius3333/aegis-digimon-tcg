// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: {
            filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
            count: "all",
          },
          gainedTrigger: "whenAttacking",
          gainedActions: [{ kind: "GainMemory", amount: -1 }],
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT5-091", compiled);
