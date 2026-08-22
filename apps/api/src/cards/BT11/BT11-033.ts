import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "opponent",
          source: "securityTop",
          condition: { kind: "lastEffectDidNotAct", raw: "no Digimon was returned by this effect" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToOpponentHand",
          actions: [{ kind: "GainMemory", amount: 1 }],
          scaling: { per: 4, filter: { zone: "hand", controller: "opponent" }, unit: "cards" },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-033", compiled);
