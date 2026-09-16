import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "sacrificePermanent",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                playCostLte: 11,
                nameOrTrait: [{ tokens: ["Negamon"], match: "text" }],
                digivolutionStackNameOrTrait: [{ tokens: ["Negamon"], match: "nameExact" }],
              },
              count: 1,
            },
          },
          amount: { kind: "deletedSacrificePlayCost" },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Rush" },
          keywords: [{ keyword: "Reboot" }, { keyword: "Blocker" }],
          duration: "permanent",
        },
      ],
      keywords: [{ keyword: "Reboot" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      colors: ["Black"],
      cost: 3,
      isAlternate: false,
    },
  ],
};

registerIrCard("BT25-076", compiled);
