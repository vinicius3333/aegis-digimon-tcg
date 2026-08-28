// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 1,
          raw: "Reduce the memory cost of this card in your hand by 1",
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: {
            kind: ["Digimon"],
          },
          mode: "play",
          byEffectOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-097", compiled);
