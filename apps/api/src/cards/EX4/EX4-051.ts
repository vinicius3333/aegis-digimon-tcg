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
            [{ kind: "DeDigivolve", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 3 }, amount: 1 }],
            [{ kind: "Digivolve", target: { filter: { controllerDefault: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 }, into: { controllerDefault: "mine", kind: ["Digimon"], levels: [1, 2, 3, 4, 5, 6], nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }] }, from: ["hand"], payCost: false, optional: true }],
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
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-051", compiled);
export default compiled;
