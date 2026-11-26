import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                { tokens: ["Avian"], match: "traitContains" },
                { tokens: ["Bird"], match: "traitContains" },
              ],
            },
            raw: "this Digimon has [Avian] or [Bird] in any of its traits",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD03-01", compiled);
