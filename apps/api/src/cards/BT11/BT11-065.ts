import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
            },
            count: 2,
            upTo: true,
            from: ["trash"],
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Fusionize"], match: "nameExact" }],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
            count: 4,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardReturnToDeckBottom",
          sourceFilter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
          actions: [
            { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-065", compiled);
