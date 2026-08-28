// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SetBaseDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levelLte: 4 }, count: 1 },
          value: 1000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "color",
          tokens: ["Yellow"],
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-014", compiled);
export default compiled;
