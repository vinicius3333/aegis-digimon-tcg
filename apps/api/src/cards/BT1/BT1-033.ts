// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { isSelf: true },
          amount: 1000,
          duration: "forTheTurn",
          condition: {
            kind: "opponentHas",
            countMin: 1,
            filter: { kind: ["Digimon"], zone: "battleArea", digivolutionCards: "none" },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-033", compiled);
export default compiled;
