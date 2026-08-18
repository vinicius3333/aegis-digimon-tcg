import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: { kind: ["Option"] },
          mode: "play",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHaveNone",
            filter: { controller: "mine", kind: ["Digimon"], unsuspended: true },
          },
          raw: "When all of your Digimon are suspended, your opponent can't use Option cards.",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          fireCondition: { kind: "phaseIs", phase: "Active" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
          raw: "When this Digimon becomes unsuspended during your unsuspend phase",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-057", compiled);
export default compiled;
