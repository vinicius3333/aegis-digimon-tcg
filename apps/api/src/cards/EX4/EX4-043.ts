// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Greymon"],
                match: "name",
              },
            ],
          },
          from: ["hand"],
          costDelta: -2,
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-043", compiled);
