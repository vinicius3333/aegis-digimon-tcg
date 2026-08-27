import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * EX4-051 — BlitzGreymon (EX4, Black Lv.6 Digimon).
 *
 * Digivolution requirement: 3 from a level 5 [MetalGreymon].
 * [When Digivolving] Choose 1 of 3 effects:
 *   1) De-Digivolve 1 on 3 opponent Digimon.
 *   2) Digivolve 1 other of your Digimon into Lv.≤6 [Garurumon] from hand, no cost.
 *   3) DNA digivolve this + another Digimon into hand card, paying cost.
 * Inherited [When Attacking][Once Per Turn] If [Omnimon] in name:
 *   trash top of opponent's security.
 */
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
