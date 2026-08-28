// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          restriction: "cantBeAttacked",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Blue"],
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-086", compiled);
