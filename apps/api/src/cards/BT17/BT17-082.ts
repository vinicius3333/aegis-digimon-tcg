import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
              nameOrTrait: [
                {
                  tokens: ["Labramon", "Seasarmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            fromDigivolution: true,
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Blue"],
                },
                count: 1,
              },
              keyword: {
                keyword: "Rush",
                raw: "＜Rush＞",
              },
              duration: "forTheTurn",
              cost: {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
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

registerIrCard("BT17-082", compiled);
