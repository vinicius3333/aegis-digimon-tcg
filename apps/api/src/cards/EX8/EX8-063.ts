// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const fallenAngel = {
  controller: "mine",
  kind: ["Digimon"],
  playCostLte: 7,
  nameOrTrait: [{ tokens: ["Fallen Angel"], match: "trait" }],
};
const stackGate = {
  kind: "anyOf",
  conditions: [
    { kind: "selfDigivolutionStackMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Barbamon"], match: "name" }] } },
    { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    ...(["WhenDigivolving", "WhenAttacking"] as const).map((trigger) => ({
      trigger,
      frequency: "OncePerTurn",
      sharedUseKey: "opponent-discard-or-fallen-angel",
      actions: [
        {
          kind: "Trash",
          chooser: "opponent",
          target: { controller: "opponent", filter: { zone: "hand" }, count: 1 },
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "ifThisEffectDidNotAct" },
          target: { filter: fallenAngel, count: 1 },
        },
      ],
    })),
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      condition: stackGate,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          handTrashedController: "opponent",
          raw: "when cards are trashed from your opponent's hand",
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Barbamon"], cost: 1, isAlternate: true }],
};

registerIrCard("EX8-063", compiled);
