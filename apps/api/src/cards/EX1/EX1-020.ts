// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 2 }],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "untilYourTurnEnd",
          noDigivolutionCards: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-020", compiled);
