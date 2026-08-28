// @ts-nocheck
// AUTO-GENERATED FROM IR — audited against ST4-16 catalog text.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: true,
              digivolutionCards: "hasAny",
            },
            count: 1,
            sameTarget: true,
          },
          amount: "all",
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

registerIrCard("ST4-16", compiled);
