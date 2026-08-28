// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ver4 = {
  controller: "mine",
  zone: "hand",
  kind: ["Digimon"],
  dp: { op: "lte", value: 6000 },
  nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }],
};
const trashAndPlay = {
  kind: "CostGatedBlock",
  cost: { kind: "trashBottomFaceDownUnderDigimon", controller: "mine" },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "PlayWithoutCost",
      target: { filter: ver4, count: 1 },
      from: ["hand"],
      payCost: false,
      optional: true,
    },
  ],
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
      ],
      actions: [],
    },
    { trigger: "WhenDigivolving", actions: [trashAndPlay] },
    { trigger: "WhenAttacking", actions: [trashAndPlay] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          requireByEffect: true,
          requireFaceDownDigivolutionCardTrashed: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -6000,
              duration: "untilEachTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["DM"], cost: 3, isAlternate: true }],
};
registerIrCard("BT26-048", compiled);
export default compiled;
