// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tbHand = { controllerDefault: "mine", zone: "hand", nameOrTrait: [{ tokens: ["TB"], match: "trait" }] };
// "play ... 1 [TB] trait card" includes every playable card kind, including
// Tamers such as BT26-104 Kunlun. Options are handled by the sibling use branch.
const tbPlayable = { ...tbHand, kind: ["Digimon", "Tamer"] };
const tbOption = { ...tbHand, kind: ["Option"] };

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }],
  effects: [
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: { filter: tbPlayable, count: 1 },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: tbOption,
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                allowMultiColor: true,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -2000,
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-012", compiled);
