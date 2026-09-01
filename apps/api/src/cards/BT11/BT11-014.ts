import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              condition: { kind: "triggerAttackerIsSelf" },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-014", compiled);
