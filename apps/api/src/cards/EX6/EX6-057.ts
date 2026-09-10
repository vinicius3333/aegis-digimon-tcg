import type { CompiledCard, GainTriggeredEffectAction, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const target: Target = { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 };
const grant: GainTriggeredEffectAction = {
  kind: "GainTriggeredEffect",
  target,
  gainedTrigger: "EndOfYourTurn",
  gainedActions: [{ kind: "Delete", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
  duration: "untilOpponentTurnEnd",
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [grant] },
    { trigger: "WhenDigivolving", actions: [{ ...grant }] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanBattle",
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
                count: 1,
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          // "another Digimon" includes either player's Digimon; only this source
          // itself is excluded (same wording as EX9-033/BT24-079).
          sourceFilter: { controller: "any", kind: ["Digimon"], excludeSelf: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("EX6-057", compiled);
