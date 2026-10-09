import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          toTop: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-007", compiled);
