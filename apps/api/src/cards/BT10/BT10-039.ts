// hand-authored override: preserve the canonical Option-kind filter for UI/server candidates
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

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
