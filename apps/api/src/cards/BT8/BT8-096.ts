import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const multicolorCondition = {
  kind: "anyOf",
  conditions: [
    { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"], multicolor: true } },
    { kind: "selfDigivolutionStackMatchesFilter", filter: { multicolor: true } },
  ],
  raw: "you have a Digimon in play with 2 or more colors, or with 2 or more colors in one of its digivolution cards",
} as const;

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
          condition: multicolorCondition,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          condition: { kind: "not", condition: multicolorCondition },
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

registerIrCard("BT8-096", compiled);
export { compiled };
export default compiled;
