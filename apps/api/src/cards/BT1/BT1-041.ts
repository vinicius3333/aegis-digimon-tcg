import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 2 }] },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
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
registerIrCard("BT1-041", compiled);
export default compiled;
