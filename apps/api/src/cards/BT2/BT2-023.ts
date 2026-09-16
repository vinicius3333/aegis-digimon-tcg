import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 1,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          handResident: true,
          duration: "permanent",
          scaling: {
            per: 1,
            filter: {
              digivolutionCards: "none",
              zone: "battleArea",
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-023", compiled);
