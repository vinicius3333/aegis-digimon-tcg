import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compositeOrWickedGod: Filter = {
  nameOrTrait: [
    { tokens: ["Composite"], match: "trait" },
    { tokens: ["Wicked God"], match: "trait", orPrevious: true },
  ],
};
const handPayment: Action = {
  kind: "Trash",
  target: { filter: { ...compositeOrWickedGod, controller: "mine", zone: "hand" }, count: 1 },
  optional: true,
  abortOnDecline: true,
};
const drawAndMemory: Action[] = [
  handPayment,
  { kind: "Draw", controller: "mine", amount: 1, condition: { kind: "ifThisEffectActed" } },
  { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed" } },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: drawAndMemory },
    { trigger: "StartOfYourMainPhase", actions: drawAndMemory },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            ...compositeOrWickedGod,
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Gazimon", "Gizamon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-055", compiled);
