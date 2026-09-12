import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      condition: {
        kind: "selfBattlesOpponentMatching",
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
      },
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
        },
      ],
      description:
        "[Your Turn] This Digimon gets +1000 DP when battling an opponent's Digimon that has no digivolution cards.",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST2-01", compiled);
