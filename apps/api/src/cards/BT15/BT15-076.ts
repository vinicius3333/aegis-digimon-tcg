import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            cardId: "BT15-076",
            kind: ["Digimon"],
          },
          from: ["hand"],
          source: "triggerSource",
          payCost: false,
          optional: true,
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Purple"],
              orFilters: [
                {
                  kind: ["Digimon"],
                  levels: [3],
                },
                {
                  kind: ["Tamer"],
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Purple"],
              orFilters: [
                {
                  kind: ["Digimon"],
                  levels: [3],
                },
                {
                  kind: ["Tamer"],
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-076", compiled);
export { compiled };
