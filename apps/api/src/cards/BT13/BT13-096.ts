import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. The [All Turns] clause uses a CostGatedBlock so the optional suspend
// processing condition and its nested may-placement resolve as independent decisions.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              levels: [3],
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Blue"],
          },
          actions: [
            {
              kind: "CostGatedBlock",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
                optional: true,
              },
              optional: true,
              abortOnDecline: true,
              actions: [
                {
                  kind: "PlaceUnder",
                  target: {
                    filter: {
                      controller: "mine",
                      zone: "hand",
                      kind: ["Digimon"],
                      colors: ["Blue"],
                      levelComparison: {
                        op: "lte",
                        value: 4,
                      },
                    },
                    count: 1,
                  },
                  from: ["hand"],
                  underFilter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Blue"],
                    isTriggerSource: true,
                  },
                  position: "bottom",
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-096", compiled);
