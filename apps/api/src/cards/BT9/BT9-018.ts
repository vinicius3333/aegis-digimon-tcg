import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

type DeleteSuspendedDigimonAction = Extract<Action, { kind: "Delete" }> & {
  preserveOncePerTurnOnDecline: true;
};

const deleteSuspendedDigimon: DeleteSuspendedDigimonAction = {
  kind: "Delete",
  target: {
    filter: {
      controller: "opponent",
      kind: ["Digimon"],
    },
    count: "all",
    sourceRef: "triggerSubject",
  },
  optional: true,
  preserveOncePerTurnOnDecline: true,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            dp: {
              op: "lte",
              value: 6000,
            },
          },
          actions: [deleteSuspendedDigimon],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-018", compiled);
