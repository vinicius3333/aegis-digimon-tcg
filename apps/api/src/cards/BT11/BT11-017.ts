// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    { trigger: "WhenDigivolving", actions: [], keywords: [{ keyword: "Blitz", raw: "＜Blitz＞" }] },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            {
              kind: "GainMemory",
              amount: 1,
              scaling: {
                per: 1,
                filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"], colors: ["Red"] },
                unit: "cards",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-017", compiled);
