import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: { isSelfRef: true },
              count: 1,
              zone: "battleArea",
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "hand",
              hasDnaDigivolutionRequirement: true,
            },
            count: 1,
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

registerIrCard("ST9-08", compiled);
