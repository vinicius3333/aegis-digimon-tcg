// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const suspendAndRestrict = {
  actions: [
    {
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2, upTo: true },
      optional: true,
    },
    {
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      cost: {
        kind: "trashBottomFaceDownUnderTamer",
        controller: "mine",
        count: 1,
        raw: "by trashing the bottom face-down card from under any of your Tamers",
      },
    },
  ],
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", ...suspendAndRestrict, frequency: "OncePerTurn", optional: true, sharedUseKey: "ir-shared-0" },
    { trigger: "WhenAttacking", ...suspendAndRestrict, frequency: "OncePerTurn", optional: true, sharedUseKey: "ir-shared-0" },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, names: ["Lilamon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("ST24-11", compiled);
