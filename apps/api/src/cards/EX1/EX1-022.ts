// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const freeSource = {
  kind: "selfDigivolutionStackHasTrait",
  filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
};
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, condition: freeSource },
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: freeSource,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1000,
          duration: "permanent",
          scaling: { per: 1, unit: "digivolutionCardColors" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-022", compiled);
