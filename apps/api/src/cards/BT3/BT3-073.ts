import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          revealScaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
              },
              orFilters: [
                {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Red"],
                  levelComparison: {
                    op: "lte",
                    value: 5,
                  },
                },
              ],
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "deckBottomAnyOrder",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-073", compiled);
