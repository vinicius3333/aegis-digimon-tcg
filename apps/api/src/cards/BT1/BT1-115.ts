// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { isSelf: true },
          condition: { kind: "youHave", filter: { controller: "mine", kind: ["Tamer"] } },
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { isSelf: true },
          amount: 1000,
          duration: "forTheTurn",
          condition: { kind: "youHave", filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"] } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-115", compiled);
export default compiled;
