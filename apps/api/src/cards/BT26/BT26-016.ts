// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashPool = {
  zone: "trash",
  orFilters: [{ controllerDefault: "mine" }, { controllerDefault: "opponent" }],
};

const deleteAndRecover = {
  kind: "Delete",
  target: {
    filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
    count: 1,
  },
  optional: true,
};
const recovery = {
  kind: "SecurityManipulation",
  op: "addTop",
  controller: "mine",
  source: "deck",
  amount: 1,
  optional: true,
  cost: {
    kind: "return",
    target: { filter: trashPool, count: 3 },
    to: "deckBottom",
    orderReturnedCards: true,
  },
};

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }],
  keywords: [
    { keyword: "Piercing", raw: "＜Piercing＞" },
    { keyword: "Engage", raw: "＜Engage＞" },
  ],
  effects: [
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-016/delete-recover",
      actions: [deleteAndRecover, recovery],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-016/delete-recover",
      actions: [deleteAndRecover, recovery],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-016/delete-recover",
      actions: [deleteAndRecover, recovery],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          optional: true,
          cost: {
            kind: "return",
            target: { filter: { zone: "security", controllerDefault: "mine", position: "top" }, count: 1 },
            to: "deckBottom",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-016", compiled);
