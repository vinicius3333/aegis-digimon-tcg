// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const raidAndBoost = [
  {
    kind: "Trash",
    target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "ModifyDP",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "soloogarmonTarget" },
    amount: 3000,
    duration: "forTheTurn",
  },
  {
    kind: "GainKeyword",
    target: { fromSelectionRef: "soloogarmonTarget" },
    keyword: { keyword: "Raid", raw: "＜Raid＞" },
    duration: "forTheTurn",
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: raidAndBoost },
    { trigger: "WhenDigivolving", actions: raidAndBoost },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { kind: ["Tamer"] },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
                count: 1,
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "DisableSecurityEffect",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          sourceKind: "option",
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Loogarmon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("BT20-071", compiled);
