import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX4-051";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "DeDigivolve",
                target: {
                  filter: { controller: "opponent", kind: ["Digimon"] },
                  count: 3,
                  forceSelection: true,
                },
                amount: 1,
                condition: {
                  kind: "opponentHas",
                  filter: { kind: ["Digimon"] },
                  countMin: 3,
                },
              },
            ],
            [
              {
                kind: "Digivolve",
                target: { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 },
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 6 },
                  nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }],
                },
                from: ["hand"],
                payCost: false,
              },
            ],
            [
              {
                kind: "DnaDigivolve",
                materials: [
                  { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
                  {
                    filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
                    count: 1,
                    zone: "battleArea",
                  },
                ],
                into: { controllerDefault: "mine", kind: ["Digimon"] },
                payCost: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "selfHasNameContaining", names: ["Omnimon"] },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full" as const,
  residual: [],
  digivolutionRequirement: [{ level: 5, names: ["MetalGreymon"], cost: 3, isAlternate: true }],
};

registerIrCard(cardId, compiled);
