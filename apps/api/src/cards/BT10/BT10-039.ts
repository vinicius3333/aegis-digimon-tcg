import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const optionFilter: Filter = {
  kind: ["Option"],
  nameOrTrait: [
    {
      tokens: ["Plug-In"],
      match: "name",
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: optionFilter,
          target: {
            filter: optionFilter,
            count: 1,
            from: ["hand"],
          },
          payCost: false,
          optional: true,
          waiveColorRequirement: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-039", compiled);
