// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const multicolorCondition = {
  kind: "anyOf",
  conditions: [
    {
      kind: "youHave",
      filter: { zone: "battleArea", kind: ["Digimon"], colorCount: 2 },
    },
    {
      kind: "youHave",
      filter: { zone: "digivolutionCards", kind: ["Digimon"], colorCount: 2 },
    },
  ],
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
            bindAs: "target",
          },
        },
        {
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "target" },
          amount: -3000,
          duration: "forTheTurn",
          condition: { kind: "not", condition: multicolorCondition },
        },
        {
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "target" },
          amount: -6000,
          duration: "forTheTurn",
          condition: multicolorCondition,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "ActivateMain" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-100", compiled);
