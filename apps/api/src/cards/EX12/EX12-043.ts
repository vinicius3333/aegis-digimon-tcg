// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [
                      {
                        tokens: ["SW"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["SW"], match: "trait" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                allowMultiColor: true,
                optional: true,
              },
            ],
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Shambala"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-043", compiled);
