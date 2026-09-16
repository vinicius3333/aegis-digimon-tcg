import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          allowCostWithoutTarget: true,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing the top card of your security stack",
          },
          optional: false,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      optional: true,
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              colors: ["Yellow"],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: true,
          condition: {
            kind: "totalSecurityCount",
            op: "lte",
            value: 6,
            raw: "there're 6 or fewer total cards in both players' security stacks",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-031", compiled);
