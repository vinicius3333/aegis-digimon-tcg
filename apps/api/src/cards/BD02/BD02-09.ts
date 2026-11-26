import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }],
            },
            raw: "you have a Digimon with [Tyrannomon] in its name",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        { kind: "AddToHandSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD02-09", compiled);
