import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX3-008 (Flamedramon).
// Errata (2022-11-11): second WD option is DNA digivolve (this Digimon + another).
// Inherited [End of Your Turn]: this Digimon + 1 other may DNA digivolve into a Digimon
// card in hand for the cost. Both effects are optional and must specify from:['hand'].
// KB Q3374: you CAN use the inherited effect after the WD effect triggers end of turn.
// KB Q3375: the target base Digimon for the first WD option does NOT need to be purple.
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
