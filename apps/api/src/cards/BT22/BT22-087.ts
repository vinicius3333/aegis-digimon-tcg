// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "CostGatedBlock",
              cost: {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              actions: [
                {
                  kind: "ModifyDP",
                  target: {
                    filter: { controller: "opponent", kind: ["Digimon"] },
                    count: 1,
                  },
                  amount: -2000,
                  duration: "forTheTurn",
                },
                {
                  kind: "AppFuse",
                  source: {
                    filter: { controller: "mine", kind: ["Digimon"] },
                    count: 1,
                  },
                  into: { controllerDefault: "mine", kind: ["Digimon"] },
                  from: ["hand"],
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

registerIrCard("BT22-087", compiled);
