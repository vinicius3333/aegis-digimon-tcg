// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Knightmon"],
                match: "text",
              },
            ],
          },
          leaveCause: "byOpponentEffect",
          actions: [],
          cost: {
            kind: "place",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            targetIsPermanent: true,
            destination: "digivolutionStack",
            position: "bottom",
            host: "triggerSource",
            raw: "by placing this Digimon as its bottom digivolution card, it doesn't leave",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-154", compiled);
