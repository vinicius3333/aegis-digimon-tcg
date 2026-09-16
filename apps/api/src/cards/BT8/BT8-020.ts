import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              excludeSelf: true,
            },
            count: 2,
            includeRef: "self",
          },
          into: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "hand",
            hasDnaDigivolutionRequirement: true,
          },
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-020", compiled);
