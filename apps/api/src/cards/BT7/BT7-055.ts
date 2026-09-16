import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
          effectTextPart: "Then, gain 1 memory for each of your opponent's suspended Digimon.",
          kind: "GainMemory",
          amount: 1,
          scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"], suspended: true } },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          restriction: "unsuspendHandTrashCost",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-055", compiled);
