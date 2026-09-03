import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-092";
const xrosHeartDigimon = {
  controller: "mine" as const,
  kind: ["Digimon" as const],
  nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" as const }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "youHave", filter: xrosHeartDigimon, raw: "you have a [Xros Heart] Digimon" },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: xrosHeartDigimon, count: 1 },
          fromSelectedPermanentDigivolutionCards: true,
          underFilter: { controller: "mine", kind: ["Tamer"] },
          position: "bottom",
          order: "any",
          trackCount: "placedXrosSources",
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: xrosHeartDigimon, count: 1 },
          from: ["hand"],
          payCost: true,
          optional: true,
          reduceCostByScaling: { per: 1, unit: "namedCount", countSource: "placedXrosSources" },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
              playCostLte: 5,
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
