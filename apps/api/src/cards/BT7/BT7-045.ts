// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              kind: ["Digimon"],
              colors: ["Green"],
            },
            count: 1,
          },
          to: "deckTop",
          optional: true,
          abortOnDecline: true,
          raw: "You may reveal 1 green Digimon card from your hand and place it on top of your deck.",
        },
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 3000,
          duration: "untilOwnerTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-045", compiled);
