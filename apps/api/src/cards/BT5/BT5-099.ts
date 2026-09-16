import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RepeatPerCount",
          countSource: "youHave",
          countFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Digimon"],
          },
          action: {
            kind: "ModifyDP",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            amount: -3000,
            duration: "forTheTurn",
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

registerIrCard("BT5-099", compiled);
