import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            count: 1,
            bindAs: "jammingTarget",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "jammingTarget",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "Jamming",
            raw: "＜Jamming＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "hand",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          underSelectionRef: "jammingTarget",
          position: "bottom",
          optional: true,
          condition: {
            kind: "playedFromZone",
            zone: "digivolutionCards",
            raw: "when played from digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-015", compiled);
