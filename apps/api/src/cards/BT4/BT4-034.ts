// KB Q1201: the draw and memory happen only when a bottom source was actually trashed.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
          amount: 1,
          fromTop: false,
        },
        { kind: "Draw", controller: "mine", amount: 1, condition: { kind: "ifThisEffectActed" } },
        { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed" } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-034", compiled);
