import { compiledEffects } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX4-049";

export const compiled: CompiledCard = {
  ...compiledEffects[cardId]!,
  effects: compiledEffects[cardId]!.effects.map((effect) => {
    if (effect.trigger !== "WhenDigivolving") return effect;
    return {
      ...effect,
      actions: [
        {
          kind: "Modal" as const,
          choose: 1,
          options: [
            [
              {
                kind: "Return" as const,
                target: {
                  filter: { controller: "opponent", kind: ["Digimon"] },
                  count: "all" as const,
                  totalPlayCostBudget: 6,
                },
                to: "deckBottom" as const,
              },
            ],
            [
              {
                kind: "Digivolve" as const,
                target: { filter: { controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 },
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 6 },
                  nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
                },
                from: ["hand"],
                payCost: false,
                ignoreRequirements: true,
                optional: true,
              },
            ],
            [
              {
                kind: "DnaDigivolve" as const,
                materials: [
                  { filter: { isSelfRef: true }, count: 1, zone: "battleArea" },
                  {
                    filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
                    count: 1,
                    zone: "battleArea",
                  },
                ],
                into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand" },
                payCost: true,
                optional: true,
              },
            ],
          ],
        },
      ],
    };
  }),
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["WereGarurumon"], cost: 3, isAlternate: true }],
};

registerIrCard(cardId, compiled);
