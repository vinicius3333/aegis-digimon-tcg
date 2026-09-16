import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          bindResultAs: "rasielmonTarget",
        },
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: 1,
            bindAs: "rasielmonLocked",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
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
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          bindResultAs: "rasielmonTarget",
        },
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: 1,
            bindAs: "rasielmonLocked",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: { boundRef: "rasielmonLocked" },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Angel", "Archangel"],
      cost: 3,
      isAlternate: true,
    },
  ],
};
registerIrCard("LM-042", compiled);
