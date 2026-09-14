import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers.",
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, ＜De-Digivolve 1＞ 1 of their Digimon.",
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers.",
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, ＜De-Digivolve 1＞ 1 of their Digimon.",
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [
              { tokens: ["Angoramon"], match: "text" },
              { tokens: ["NSp"], match: "trait" },
            ],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, texts: ["Angoramon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["NSp"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("EX12-051", compiled);

export { compiled };
