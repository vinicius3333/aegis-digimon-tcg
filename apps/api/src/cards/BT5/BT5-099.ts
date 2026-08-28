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
          // Each loop is a separate activation and therefore may choose a
          // different opposing Digimon (KB Q1374).
          kind: "RepeatPerCount",
          countSource: "youHave",
          countFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Digimon"],
          },
          action: {
            kind: "ModifyDP",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            amount: -3000,
            duration: "forTheTurn",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-099", compiled);
