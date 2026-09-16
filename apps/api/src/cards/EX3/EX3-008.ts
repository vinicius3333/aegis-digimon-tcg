import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: [
            "Digivolve 1 of your other Digimon into a purple level 4 [Free] Digimon from your trash",
            "DNA digivolve this Digimon and 1 of your other Digimon into a Digimon in your hand",
          ],
          options: [
            [
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
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Purple"],
                    levels: [4],
                    nameOrTrait: [
                      {
                        tokens: ["Free"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                payCost: true,
                from: ["trash"],
                optional: true,
              },
            ],
            [
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
                      excludeSelf: true,
                      kind: ["Digimon"],
                    },
                    count: 1,
                    zone: "battleArea",
                  },
                ],
                into: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                payCost: true,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
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
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
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

registerIrCard("EX3-008", compiled);
export default compiled;
