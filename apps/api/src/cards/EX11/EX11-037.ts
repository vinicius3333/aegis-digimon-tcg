import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  digivolutionRequirement: [{ namesExact: ["Kapurimon"], cost: 0, isAlternate: true }],
  effects: [
    {
      trigger: "WhenMoving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "this effect didn't flip",
          },
          ifTrue: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "flipFaceUp",
          controller: "opponent",
        },
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "this effect didn't flip",
          },
          ifTrue: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-037", compiled);
