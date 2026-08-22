// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [{ kind: "Return", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: "all", totalPlayCostBudget: 6, minimum: 1 }, to: "deckBottom" }],
            [{ kind: "Digivolve", target: { filter: { controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 }, into: { controllerDefault: "mine", kind: ["Digimon"], levels: [1, 2, 3, 4, 5, 6], nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] }, from: ["hand"], payCost: false, optional: true }],
            [{ kind: "DnaDigivolve", materials: { filter: { controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1, includeRef: "self" }, into: { controllerDefault: "mine", kind: ["Digimon"] }, payCost: true, optional: true }],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      condition: { kind: "selfHasNameContaining", tokens: ["Omnimon"] },
      actions: [{ kind: "Return", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"], levels: [1, 2, 3, 4, 5] }, count: 1 }, to: "deckBottom" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-049", compiled);
export default compiled;
