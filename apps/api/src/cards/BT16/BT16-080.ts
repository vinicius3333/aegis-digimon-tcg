import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dpOrDelete: Action[] = [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: -7000,
    duration: "forTheTurn",
    condition: { kind: "securityAtLeast", value: 3 },
  },
  {
    kind: "Delete",
    target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: false }, count: 1 },
    condition: { kind: "securityAtMost", value: 3 },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "dp-or-delete", actions: dpOrDelete },
    {
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      sharedUseKey: "dp-or-delete",
      condition: {
        kind: "anyOf",
        conditions: [{ kind: "triggerAttackerIsSelf" }, { kind: "triggerDefenderIsSelf" }],
      },
      actions: dpOrDelete,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          mode: "prevent",
          leaveCause: "opponentEffect",
          condition: { kind: "securityAtLeast", value: 3 },
          actions: [],
          cost: { kind: "trashSecurityTop", raw: "by trashing the top security card" },
        },
      ],
    },
    { trigger: "OnDeletion", actions: [{ kind: "Recover", amount: 1, untilSecurityCount: 3 }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, texts: ["Pulsemon"], cost: 5, isAlternate: true }],
};

registerIrCard("BT16-080", compiled);
