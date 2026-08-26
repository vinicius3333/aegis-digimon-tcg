import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "attackPlayers",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-037", compiled);
