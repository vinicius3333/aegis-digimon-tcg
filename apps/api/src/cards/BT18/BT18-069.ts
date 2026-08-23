// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "EndOfOpponentsTurn",
      optional: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          mandatory: true,
          attackPlayer: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
            count: "all",
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-069", compiled);
