// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4132: the Option can be used without a Patamon; the Main effect then moves nothing.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      condition: {
        kind: "youHave",
        filter: {
          zone: "battleArea",
          controllerDefault: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["T.K. Takaishi"], match: "nameExact" }],
        },
        raw: "you have [T.K. Takaishi] in play",
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Patamon"], match: "nameExact" }],
            },
            count: 1,
            bindAs: "selectedPatamon",
          },
        },
        {
          kind: "TrashDigivolution",
          target: {
            fromSelectionRef: "selectedPatamon",
            filter: {},
            count: 1,
          },
          amount: 99,
        },
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "mine",
          source: {
            fromSelectionRef: "selectedPatamon",
            filter: {},
            count: 1,
          },
          faceDown: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "AddToHandSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-023", compiled);
