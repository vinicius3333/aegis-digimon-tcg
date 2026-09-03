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
          amount: 2000,
          duration: "forTheTurn",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "opponentHas",
            countMin: 2,
            filter: { kind: ["Digimon"], zone: "battleArea", digivolutionCards: "none" },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-004", compiled);
export default compiled;
