// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q5511-Q5515: triggers when you USE an Option card with use cost 2+; does not
// trigger for Security activations or Delay activations. Cost reduction to the paid
// amount doesn't affect whether it triggers — original use cost is checked.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [
                {
                  tokens: ["Plug-In"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [
                {
                  tokens: ["Plug-In"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Renamon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-031", compiled);
