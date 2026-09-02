import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
} as const;
const progress: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  keywords: ["Progress"],
};
const reptileOrDragonkin: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  // "[Reptile] or [Dragonkin] trait": declare the union explicitly rather than relying on the
  // interpreter's implicit multi-entry default. Exact traits, so [Reptile Man] stays out.
  nameOrTrait: [
    { match: "trait", tokens: ["Reptile"] },
    { match: "trait", tokens: ["Dragonkin"], orPrevious: true },
  ],
};
const reward: Action[] = [
  {
    kind: "Draw",
    controller: "mine",
    amount: 1,
    cost: suspendCost,
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "ModifyDP",
    target: { filter: progress, count: 1 },
    amount: 3000,
    duration: "forTheTurn",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "AllTurns",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: reptileOrDragonkin, actions: reward },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: reptileOrDragonkin,
          actions: reward,
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

registerIrCard("EX11-054", compiled);
