// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const sharedUseKey = "ir-shared-0";

const battleAction = {
  kind: "Battle",
  attacker: {
    filter: { controller: "mine", kind: ["Digimon"] },
    count: 1,
    fromSelectionRef: "buffedDigimon",
  },
  defender: {
    filter: { controller: "opponent", kind: ["Digimon"] },
    count: 1,
  },
};

const dpAndBattleActions = [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "buffedDigimon" },
    amount: 3000,
    duration: "untilOpponentTurnEnd",
    optional: true,
  },
  battleAction,
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Vortex", raw: "＜Vortex＞" }],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
            },
            raw: "you have an [NSp] trait card in play",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          restriction: "beAffected",
          fromSourceKind: ["Digimon"],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: dpAndBattleActions,
      frequency: "OncePerTurn",
      sharedUseKey,
    },
    {
      trigger: "WhenAttacking",
      actions: dpAndBattleActions,
      frequency: "OncePerTurn",
      sharedUseKey,
    },
    {
      trigger: "Counter",
      actions: dpAndBattleActions,
      frequency: "OncePerTurn",
      sharedUseKey,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { controller: "mine", kind: ["Digimon"], suspended: true }, count: 1 },
          optional: true,
        },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, texts: ["Angoramon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["NSp"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("EX12-052", compiled);

export { compiled };
