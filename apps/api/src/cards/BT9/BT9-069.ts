import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Unsuspend up to 2 Digimon and/or Tamers.",
          kind: "Unsuspend",
          target: {
            filter: {
              kind: ["Digimon", "Tamer"],
            },
            count: 2,
            upTo: true,
          },
        },
        {
          effectTextPart: "Then, gain 1 memory for each of your opponent's unsuspended Digimon and Tamers.",
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon", "Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "security",
              controller: "opponent",
              position: "top",
            },
            count: 1,
          },
          scaling: {
            per: 2,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              unsuspended: true,
              kind: ["Digimon", "Tamer"],
            },
            unit: "cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-069", compiled);
