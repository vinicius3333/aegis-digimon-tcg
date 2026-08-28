// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q1868: the inherited color count uses the host's effective colors, including
// colors granted by continuous effects before deletion.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: { kind: "selfColorCount", op: "gte", value: 2, raw: "this Digimon has 2 or more colors" },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-074", compiled);
