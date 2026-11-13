import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Progress", raw: "＜Progress＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          effectTextPart:
            "Delete up to 7000 DP total worth of your opponent's Digimon. For every 8000 DP this Digimon has, add 4000 to this DP deletion effect's maximum.",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all", upTo: true, totalDpCap: 7000 },
          totalDpCapScaling: { per: 8000, unit: "selfDP", amount: 4000 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
          duration: "permanent",
          scaling: { per: 8000, unit: "selfDP" },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          effectTextPart: "1 of your [ALYSION] trait Digimon gets +10000 DP for the turn.",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            count: 1,
          },
          amount: 10000,
          duration: "forTheTurn",
        },
        {
          kind: "Delete",
          effectTextPart: "Then, delete 1 of your opponent's Digimon with as much DP as 1 of your Digimon or less.",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", relativeToFilter: { controller: "mine", kind: ["Digimon"] } },
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, texts: ["Gemmon"], cost: 3, isAlternate: true }],
};

registerIrCard("ST25-05", compiled);
