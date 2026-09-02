import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const highCap: CompiledCard["effects"][number]["condition"] = {
  kind: "anyOf",
  conditions: [
    { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], multicolor: true } },
    {
      kind: "youHave",
      filter: {
        zone: "digivolutionCards",
        controllerDefault: "mine",
        multicolor: true,
        hostFilter: { kind: ["Digimon"] },
      },
    },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
          condition: highCap,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          condition: { kind: "not", condition: highCap },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
          condition: highCap,
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
          condition: { kind: "not", condition: highCap },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-096", compiled);
